package co.antesdeabrir.piloto;

import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Firebase telemetry from Android's notification listener, independently of the
 * WebView lifecycle. User-consented ONLY. Persist minimal events across process
 * death and network failures; never send URLs, message text or domains.
 *
 * No new Android permission or background foreground-service requirement:
 * the existing, user-authorized NotificationListenerService provides callbacks.
 * Android may throttle callbacks/retries under Doze or OEM restrictions.
 */
public final class FirebaseBackgroundTelemetry {
    private FirebaseBackgroundTelemetry() {}
    private static final String TAG = "SmartGuardTelemetry";
    private static final String PROJECT = "smartguard-piloto-20261029";
    private static final String FIREBASE_API_KEY = "AIzaSyCunqWXHELO4hFOsi12kj3lWxCm5oSJXOc"; // Firebase PUBLIC API key
    private static final String PREF = "smartguard_firebase_background_v059";
    private static final String KEYSTORE_ALIAS = "smartguard-firebase-refresh-v059";
    private static final int CAPACITY = 1000;
    private static final long MAX_EVENT_AGE = 6L * 24 * 60 * 60 * 1000;
    private static final long HEARTBEAT_INTERVAL_MS = 12L * 60 * 1000;
    private static final ScheduledExecutorService EXECUTOR = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "smartguard-background-firebase");
        t.setDaemon(true);
        return t;
    });
    private static final AtomicBoolean WORKING = new AtomicBoolean(false);
    private static final AtomicBoolean SCHEDULED = new AtomicBoolean(false);
    private static final SecureRandom RAND = new SecureRandom();
    private static volatile Queue QUEUE;
    private static Queue queue(Context ctx) {
        Queue current=QUEUE;
        if(current!=null) return current;
        synchronized (FirebaseBackgroundTelemetry.class) {
            if(QUEUE==null) QUEUE=new Queue(ctx);
            return QUEUE;
        }
    }

    private static SharedPreferences p(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    private static final class Queue extends SQLiteOpenHelper {
        Queue(Context ctx) { super(ctx.getApplicationContext(), "sg_firebase_queue_v059.db", null, 1); }
        @Override public void onCreate(SQLiteDatabase db) {
            db.execSQL("CREATE TABLE events (id TEXT PRIMARY KEY, source_hash TEXT UNIQUE NOT NULL, color TEXT NOT NULL, at_ms INTEGER NOT NULL, engine_version TEXT NOT NULL)");
            db.execSQL("CREATE INDEX events_at ON events(at_ms)");
        }
        @Override public void onUpgrade(SQLiteDatabase db, int from, int to) { throw new IllegalStateException("Unexpected queue upgrade"); }
    }

    public static synchronized void register(Context ctx, String uid, String refreshToken,
                                             boolean colors, boolean share, String apkVersion) throws Exception {
        if (!uid.matches("^[A-Za-z0-9]{12,128}$") || refreshToken == null || refreshToken.length() < 20 || refreshToken.length() > 8192
                || !apkVersion.matches("^[0-9][0-9A-Za-z._-]{0,31}$")) {
            throw new IllegalArgumentException("Identidad Firebase o versión inválida");
        }
        // AndroidKeyStore AES/GCM: no credential or ID token written in plaintext.
        String encrypted = encrypt(refreshToken);
        SharedPreferences old = p(ctx);
        String oldUid = old.getString("uid", "");
        if (!oldUid.isEmpty() && !oldUid.equals(uid)) {
            // Switching installations must never attach old events to a new UID.
            queue(ctx).getWritableDatabase().delete("events", null, null);
        }
        old.edit().putString("uid", uid).putString("token", encrypted)
            .putBoolean("enabled", true).putBoolean("colors", colors)
            .putBoolean("share", share).putString("version", apkVersion)
            .putLong("configured_at", System.currentTimeMillis())
            .remove("error").apply();
        schedule(ctx);
        flushAsync(ctx);
    }

    public static synchronized void stop(Context ctx) {
        // Stop local events BEFORE remote revocation to fail closed while offline.
        p(ctx).edit().putBoolean("enabled", false).remove("token").remove("uid")
            .remove("colors").remove("share").remove("version")
            .remove("error").apply();
        queue(ctx).getWritableDatabase().delete("events", null, null);
    }

    public static boolean canRecord(Context ctx) {
        SharedPreferences pref = p(ctx);
        return pref.getBoolean("enabled", false) && pref.getBoolean("colors", false)
            && pref.contains("token") && pref.contains("uid");
    }

    /** Call ONLY after the native engine has produced its final risk decision. */
    public static void record(Context ctx, String color, long atMillis, String engineVersion, String privateSourceKey) {
        if (!canRecord(ctx) || !isColor(color) || privateSourceKey == null) return;
        if (!engineVersion.matches("^[0-9][0-9A-Za-z._-]{0,31}$")) return;
        long now = System.currentTimeMillis();
        if (atMillis > now + 120000 || now - atMillis > MAX_EVENT_AGE) return;
        try {
            // Source content is hashed and remains strictly on-device, for deduplication.
            String sourceHash = localHash(ctx, privateSourceKey);
            Queue helper = new Queue(ctx);
            SQLiteDatabase db = helper.getWritableDatabase();
            android.content.ContentValues values = new android.content.ContentValues();
            values.put("id", UUID.randomUUID().toString().replace("-", ""));
            values.put("source_hash", sourceHash);
            values.put("color", color);
            values.put("at_ms", atMillis);
            values.put("engine_version", engineVersion);
            db.insertWithOnConflict("events", null, values, SQLiteDatabase.CONFLICT_IGNORE);
            db.execSQL("DELETE FROM events WHERE at_ms < ?", new Object[]{now - MAX_EVENT_AGE});
            db.execSQL("DELETE FROM events WHERE id IN (SELECT id FROM events ORDER BY at_ms DESC LIMIT -1 OFFSET " + CAPACITY + ")");
            flushAsync(ctx);
        } catch (Exception e) { Log.w(TAG, "Couldn't persist queue entry: " + e.getClass().getSimpleName()); }
    }

    private static boolean isColor(String c) { return "green".equals(c) || "orange".equals(c) || "red".equals(c); }

    /** Start background retry only after the OS binds the notification listener. */
    public static void schedule(Context ctx) {
        if (!SCHEDULED.compareAndSet(false,true)) return;
        Context app = ctx.getApplicationContext();
        EXECUTOR.scheduleWithFixedDelay(() -> doFlush(app), 2, 3 * 60, TimeUnit.SECONDS);
        flushAsync(app);
    }

    public static void flushAsync(Context ctx) {
        Context app = ctx.getApplicationContext();
        try { EXECUTOR.execute(() -> doFlush(app)); } catch (Exception ignored) { }
    }

    private static final class Event {
        String id, color, version;
        long at;
    }

    private static Event head(Context ctx) {
        try (Cursor c = queue(ctx).getReadableDatabase().rawQuery(
            "SELECT id,color,at_ms,engine_version FROM events ORDER BY at_ms ASC LIMIT 1", null)) {
            if (!c.moveToFirst()) return null;
            Event e = new Event(); e.id = c.getString(0); e.color = c.getString(1);
            e.at = c.getLong(2); e.version = c.getString(3); return e;
        }
    }

    public static int pending(Context ctx) {
        try (Cursor c = queue(ctx).getReadableDatabase().rawQuery("SELECT count(*) FROM events", null)) {
            return c.moveToFirst() ? c.getInt(0) : 0;
        } catch (Exception e) { return -1; }
    }

    public static JSONObject status(Context ctx) {
        SharedPreferences pref = p(ctx);
        JSONObject info = new JSONObject();
        try {
            info.put("active", pref.getBoolean("enabled",false));
            info.put("colors", pref.getBoolean("colors",false));
            info.put("pending", pending(ctx));
            info.put("lastSentAt", pref.getLong("last_sent",0));
            info.put("lastHeartbeatAt", pref.getLong("last_heartbeat",0));
            info.put("error", pref.getString("error",""));
            info.put("needsReconnection", !pref.contains("token") && pref.getBoolean("enabled",false));
        } catch(Exception ignored) { }
        return info;
    }

    private static void doFlush(Context ctx) {
        if (!WORKING.compareAndSet(false,true)) return;
        try {
            SharedPreferences pref = p(ctx);
            if (!pref.getBoolean("enabled",false)) return;
            String uid = pref.getString("uid", "");
            String encrypted = pref.getString("token", "");
            if (uid.isEmpty() || encrypted.isEmpty()) return;
            String refreshToken = decrypt(encrypted);
            if (refreshToken == null) { markError(ctx,"SESION_NO_DISPONIBLE"); return; }
            JSONObject auth = refresh(refreshToken);
            if (!uid.equals(auth.optString("user_id"))) { markError(ctx,"IDENTIDAD_NO_COINCIDE"); return; }
            if (!PROJECT.equals(auth.optString("project_id",PROJECT))) { markError(ctx,"PROYECTO_INCORRECTO"); return; }
            String idToken = auth.getString("id_token");
            String rotated = auth.optString("refresh_token", "");
            if (!rotated.isEmpty() && !rotated.equals(refreshToken)) {
                if (!pref.getBoolean("enabled",false)) return;
                pref.edit().putString("token", encrypt(rotated)).apply();
            }
            // Activity is recorded even when there are no link notifications.
            long now = System.currentTimeMillis();
            if (now - pref.getLong("last_heartbeat",0) > HEARTBEAT_INTERVAL_MS) {
                int heartbeatCode = updateHeartbeat(idToken,uid,pref.getString("version","0.5.9"));
                if (heartbeatCode >= 200 && heartbeatCode < 300) pref.edit().putLong("last_heartbeat",now).apply();
                else if (heartbeatCode == 401 || heartbeatCode == 403) { markError(ctx,"AUTH_O_PERMISOS"); return; }
            }
            if (!pref.getBoolean("colors",false)) return;
            int processed = 0;
            while (processed < 25 && pref.getBoolean("enabled",false) && pref.getBoolean("colors",false)) {
                Event e = head(ctx); if (e == null) break;
                if (System.currentTimeMillis()-e.at > MAX_EVENT_AGE) {
                    remove(ctx,e.id); continue;
                }
                int code = sendEvent(idToken,uid,e);
                if (code >= 200 && code < 300 || code == 409 || code == 412) {
                    remove(ctx,e.id);
                    pref.edit().putLong("last_sent",System.currentTimeMillis()).remove("error").apply();
                    processed++;
                } else { markError(ctx,"SINCRONIZACION_HTTP_"+code); break; }
            }
        } catch(Exception e) { markError(ctx,"RED_O_SESION_NO_DISPONIBLE"); }
        finally { WORKING.set(false); }
    }

    private static void remove(Context ctx,String id) {
        queue(ctx).getWritableDatabase().delete("events","id=?",new String[]{id});
    }

    private static void markError(Context ctx,String err) {
        // Only a code, never a token, URL, domain or message in logs/status.
        p(ctx).edit().putString("error",err).apply();
    }

    private static JSONObject refresh(String token) throws Exception {
        String body = "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(token,"UTF-8");
        Response res = request("https://securetoken.googleapis.com/v1/token?key=" + FIREBASE_API_KEY,
            "application/x-www-form-urlencoded", body, null);
        if (res.code < 200 || res.code >= 300) throw new IllegalStateException("AUTH_"+res.code);
        return new JSONObject(res.text);
    }

    private static int updateHeartbeat(String token,String uid,String version) throws Exception {
        String name=docPath(uid);
        JSONObject fields = new JSONObject().put("apkVersion", new JSONObject().put("stringValue",version));
        JSONObject write = new JSONObject().put("update",new JSONObject().put("name",name).put("fields",fields))
            .put("updateMask",new JSONObject().put("fieldPaths",new JSONArray().put("apkVersion")))
            .put("updateTransforms",new JSONArray().put(new JSONObject().put("fieldPath","lastSeenAt").put("setToServerValue","REQUEST_TIME")))
            .put("currentDocument",new JSONObject().put("exists",true));
        return commit(token,new JSONArray().put(write));
    }

    private static int sendEvent(String token,String uid,Event e) throws Exception {
        String name=docPath(uid)+"/analyses/"+e.id;
        JSONObject fields = new JSONObject().put("color",new JSONObject().put("stringValue",e.color))
            .put("engineVersion",new JSONObject().put("stringValue",e.version))
            .put("occurredAt",new JSONObject().put("timestampValue",date(e.at)));
        JSONObject write = new JSONObject().put("update",new JSONObject().put("name",name).put("fields",fields))
            .put("updateTransforms",new JSONArray().put(new JSONObject().put("fieldPath","receivedAt").put("setToServerValue","REQUEST_TIME")))
            .put("currentDocument",new JSONObject().put("exists",false));
        return commit(token,new JSONArray().put(write));
    }

    private static int commit(String token,JSONArray writes) throws Exception {
        JSONObject payload = new JSONObject().put("writes",writes);
        return request("https://firestore.googleapis.com/v1/projects/"+PROJECT+"/databases/(default)/documents:commit",
            "application/json",payload.toString(),token).code;
    }

    private static String docPath(String uid) {
        return "projects/"+PROJECT+"/databases/(default)/documents/devices/"+uid;
    }

    private static String date(long ms) {
        SimpleDateFormat fmt=new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",Locale.US);
        fmt.setTimeZone(TimeZone.getTimeZone("UTC"));return fmt.format(new Date(ms));
    }

    private static final class Response {
        final int code; final String text;
        Response(int code,String text){this.code=code;this.text=text;}
    }
    private static Response request(String url,String type,String body,String token) throws Exception {
        HttpURLConnection conn=(HttpURLConnection)new URL(url).openConnection();
        try {
            conn.setRequestMethod("POST");conn.setConnectTimeout(12000);conn.setReadTimeout(16000);
            conn.setUseCaches(false);conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type",type);
            if(token!=null)conn.setRequestProperty("Authorization","Bearer "+token);
            byte[] raw=body.getBytes(StandardCharsets.UTF_8);
            conn.setFixedLengthStreamingMode(raw.length);
            try(OutputStream os=conn.getOutputStream()){os.write(raw);}
            int status=conn.getResponseCode();
            InputStream stream=status>=200 && status<400 ? conn.getInputStream():conn.getErrorStream();
            ByteArrayOutputStream out=new ByteArrayOutputStream();
            if(stream!=null)try(InputStream in=stream){byte[] chunk=new byte[4096];int n;
                while((n=in.read(chunk))!=-1 && out.size()<65536)out.write(chunk,0,n);
            }
            return new Response(status,out.toString("UTF-8"));
        } finally { conn.disconnect(); }
    }

    private static String localHash(Context ctx,String privateKey) throws Exception {
        SharedPreferences pref=p(ctx);
        String salt=pref.getString("hash_salt","");
        if(salt.isEmpty()) {
            byte[] bytes=new byte[32];RAND.nextBytes(bytes);salt=Base64.encodeToString(bytes,Base64.NO_WRAP|Base64.NO_PADDING|Base64.URL_SAFE);
            pref.edit().putString("hash_salt",salt).apply();
        }
        java.security.MessageDigest sha=java.security.MessageDigest.getInstance("SHA-256");
        byte[] raw=sha.digest((salt+"|"+privateKey).getBytes(StandardCharsets.UTF_8));
        StringBuilder out=new StringBuilder();for(byte b:raw)out.append(String.format(Locale.ROOT,"%02x",b&0xff));
        return out.toString();
    }

    private static SecretKey key() throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(store.containsAlias(KEYSTORE_ALIAS))return ((KeyStore.SecretKeyEntry)store.getEntry(KEYSTORE_ALIAS,null)).getSecretKey();
        KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        gen.init(new KeyGenParameterSpec.Builder(KEYSTORE_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true).build());
        return gen.generateKey();
    }
    private static String encrypt(String value) throws Exception {
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());
        byte[] iv=cipher.getIV();byte[] raw=cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        byte[] blob=new byte[iv.length+raw.length];System.arraycopy(iv,0,blob,0,iv.length);
        System.arraycopy(raw,0,blob,iv.length,raw.length);
        return Base64.encodeToString(blob,Base64.NO_WRAP);
    }
    private static String decrypt(String blob) throws Exception {
        byte[] raw=Base64.decode(blob,Base64.DEFAULT);if(raw.length<29)return null;
        byte[] iv=new byte[12];System.arraycopy(raw,0,iv,0,12);
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,iv));
        return new String(cipher.doFinal(raw,12,raw.length-12),StandardCharsets.UTF_8);
    }
}
