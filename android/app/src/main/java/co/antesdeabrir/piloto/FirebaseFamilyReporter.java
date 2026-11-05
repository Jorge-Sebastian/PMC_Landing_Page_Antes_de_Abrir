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
import java.net.IDN;
import java.net.URI;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Locale;
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
 * Firestore family red-domain upload. Runs only after explicit family consent.
 * Does NOT share message text, full URL, path, query, person nickname or device
 * telemetry. Family identity is separate from aggregate administrator telemetry.
 * Work is retried while NotificationListenerService is bound by Android.
 */
public final class FirebaseFamilyReporter {
    private FirebaseFamilyReporter() {}
    private static final String TAG = "SmartGuardFamily";
    private static final String PROJECT = "smartguard-piloto-20261029";
    private static final String PUBLIC_API_KEY = "AIzaSyCunqWXHELO4hFOsi12kj3lWxCm5oSJXOc";
    private static final String PREF = "smartguard_family_native_v060";
    private static final String KEY_ALIAS = "smartguard-family-refresh-v060";
    private static final String ROOM_RE = "SG-[A-HJ-NP-Z2-9]{16}";
    private static final String UID_RE = "[A-Za-z0-9]{12,128}";
    private static final int MAX_EVENTS = 250;
    private static final long MAX_AGE_MS = 6L * 24 * 60 * 60 * 1000;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final AtomicBoolean SCHEDULED = new AtomicBoolean(false);
    private static final AtomicBoolean BUSY = new AtomicBoolean(false);
    private static final ScheduledExecutorService EXECUTOR = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "smartguard-family-upload"); t.setDaemon(true); return t;
    });

    private static SharedPreferences pref(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }
    private static final class Queue extends SQLiteOpenHelper {
        Queue(Context c) { super(c.getApplicationContext(), "smartguard_family_events_v060.db", null, 1); }
        @Override public void onCreate(SQLiteDatabase db) {
            db.execSQL("CREATE TABLE events (id TEXT PRIMARY KEY, source_hash TEXT UNIQUE NOT NULL, domain TEXT NOT NULL, timestamp_ms INTEGER NOT NULL)");
            db.execSQL("CREATE INDEX idx_family_time ON events(timestamp_ms)");
        }
        @Override public void onUpgrade(SQLiteDatabase db, int a, int b) { throw new IllegalStateException("Unknown family queue schema"); }
    }
    private static void empty(Context c) {
        try (Queue helper = new Queue(c)) { helper.getWritableDatabase().delete("events", null, null); }
    }

    public static synchronized void register(Context c, String uid, String refreshToken, String code, boolean share) throws Exception {
        if (uid == null || !uid.matches(UID_RE) || code == null || !code.matches(ROOM_RE)
                || refreshToken == null || refreshToken.length() < 20 || refreshToken.length() > 8192)
            throw new IllegalArgumentException("Sesion o sala no valida");
        SharedPreferences p = pref(c);
        if (!uid.equals(p.getString("uid", "")) || !code.equals(p.getString("room", ""))) empty(c);
        // Fail closed while switching identity, room or consent. Never persist raw refresh credentials.
        p.edit().putString("uid", uid).putString("room", code)
            .putString("encrypted", encrypt(refreshToken)).putBoolean("enabled", share)
            .remove("error").apply();
        schedule(c);
        flushAsync(c);
    }
    public static synchronized void stop(Context c) {
        pref(c).edit().putBoolean("enabled", false).remove("uid").remove("room")
            .remove("encrypted").remove("error").apply();
        empty(c);
    }
    public static JSONObject status(Context c) {
        SharedPreferences p = pref(c);
        JSONObject result = new JSONObject();
        try {
            result.put("active", p.getBoolean("enabled", false));
            result.put("room", p.getString("room", ""));
            result.put("pending", pending(c));
            result.put("lastSentAt", p.getLong("last_sent", 0));
            result.put("error", p.getString("error", ""));
        } catch (Exception ignored) { }
        return result;
    }
    public static int pending(Context c) {
        try (Queue q = new Queue(c); Cursor cursor = q.getReadableDatabase().rawQuery("SELECT count(*) FROM events", null)) {
            return cursor.moveToFirst() ? cursor.getInt(0) : 0;
        } catch (Exception e) { return -1; }
    }
    private static String canonicalDomain(String raw) {
        try {
            if (raw == null || raw.length() > 4096) return null;
            URI uri = new URI(raw);
            if (!"https".equalsIgnoreCase(uri.getScheme()) && !"http".equalsIgnoreCase(uri.getScheme())) return null;
            if (uri.getRawUserInfo() != null || uri.getRawFragment() != null) return null;
            String path = uri.getRawPath();
            if (path != null && path.matches("(?i).*\\b(reset|recover|verify|invite|auth|token|session)\\b.*")) return null;
            String query = uri.getRawQuery();
            if (query != null && query.matches("(?i).*(^|[&?])(token|code|password|email|auth|session|sig|key|ticket|invite)[_-]?[^=]*=.*")) return null;
            String host = uri.getHost(); if (host == null) return null;
            host = IDN.toASCII(host.toLowerCase(Locale.ROOT), IDN.USE_STD3_ASCII_RULES);
            if (host.endsWith(".")) host = host.substring(0,host.length()-1);
            if (!host.matches("[a-z0-9-]+(\\.[a-z0-9-]+)+") || host.length() > 253) return null;
            if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) return null;
            String[] parts = host.split("\\.");
            if (parts.length < 2) return null;
            // Conservative registrable-domain reduction for common ccTLDs and private hosting.
            String suffix = parts[parts.length-2] + "." + parts[parts.length-1];
            boolean threePart = suffix.equals("com.co") || suffix.equals("com.br") || suffix.equals("co.uk")
                || suffix.equals("com.mx") || suffix.equals("org.co") || suffix.equals("edu.co")
                || suffix.equals("vercel.app") || suffix.equals("firebaseapp.com") || suffix.equals("web.app")
                || suffix.equals("github.io") || suffix.equals("pages.dev") || suffix.equals("netlify.app");
            if (threePart && parts.length >= 3) return parts[parts.length-3] + "." + suffix;
            return suffix;
        } catch (Exception ignored) { return null; }
    }
    public static void record(Context c, String rawUrl, String color, long occurredAt, String uniqueSource) {
        if (!"red".equals(color) || uniqueSource == null) return;
        SharedPreferences p = pref(c);
        if (!p.getBoolean("enabled", false) || !p.contains("encrypted") || !p.contains("uid")) return;
        String domain = canonicalDomain(rawUrl);
        if (domain == null) return;
        long now = System.currentTimeMillis();
        if (occurredAt > now + 120000 || occurredAt < now - MAX_AGE_MS) return;
        try (Queue helper = new Queue(c)) {
            SQLiteDatabase db = helper.getWritableDatabase();
            String hash = hashLocal(c, uniqueSource);
            android.content.ContentValues values = new android.content.ContentValues();
            values.put("id", UUID.randomUUID().toString().replace("-", ""));
            values.put("source_hash", hash); values.put("domain", domain); values.put("timestamp_ms", occurredAt);
            db.insertWithOnConflict("events", null, values, SQLiteDatabase.CONFLICT_IGNORE);
            db.execSQL("DELETE FROM events WHERE timestamp_ms < ?", new Object[] { now - MAX_AGE_MS });
            db.execSQL("DELETE FROM events WHERE id IN (SELECT id FROM events ORDER BY timestamp_ms DESC LIMIT -1 OFFSET " + MAX_EVENTS + ")");
            flushAsync(c);
        } catch (Exception e) { Log.w(TAG, "Queue error: " + e.getClass().getSimpleName()); }
    }
    public static void schedule(Context c) {
        if (!SCHEDULED.compareAndSet(false, true)) return;
        Context app = c.getApplicationContext();
        EXECUTOR.scheduleWithFixedDelay(() -> doFlush(app), 2, 3 * 60, TimeUnit.SECONDS);
        flushAsync(app);
    }
    public static void flushAsync(Context c) {
        Context app = c.getApplicationContext();
        try { EXECUTOR.execute(() -> doFlush(app)); } catch (Exception ignored) { }
    }
    private static JSONObject next(Context c) {
        try (Queue q = new Queue(c); Cursor cur = q.getReadableDatabase().rawQuery("SELECT id,domain FROM events ORDER BY timestamp_ms ASC LIMIT 1", null)) {
            if (!cur.moveToFirst()) return null;
            return new JSONObject().put("id", cur.getString(0)).put("domain", cur.getString(1));
        } catch (Exception e) { return null; }
    }
    private static void remove(Context c, String id) {
        try (Queue q = new Queue(c)) { q.getWritableDatabase().delete("events", "id=?", new String[] { id }); }
    }
    private static void error(Context c, String code) { pref(c).edit().putString("error", code).apply(); }
    private static void doFlush(Context c) {
        if (!BUSY.compareAndSet(false, true)) return;
        try {
            SharedPreferences p = pref(c);
            if (!p.getBoolean("enabled", false)) return;
            String uid = p.getString("uid", ""), room = p.getString("room", "");
            if (!uid.matches(UID_RE) || !room.matches(ROOM_RE)) return;
            String encrypted = p.getString("encrypted", "");
            if (encrypted.isEmpty()) return;
            String refreshToken = decrypt(encrypted);
            if (refreshToken == null) { error(c, "RECONEXION_NECESARIA"); return; }
            JSONObject auth = refresh(refreshToken);
            if (!uid.equals(auth.optString("user_id"))) { error(c, "IDENTIDAD_NO_COINCIDE"); return; }
            String project = auth.optString("project_id", PROJECT);
            if (!PROJECT.equals(project) && !"88563158627".equals(project)) { error(c, "PROYECTO_INCORRECTO"); return; }
            String idToken = auth.getString("id_token");
            String rotated = auth.optString("refresh_token", "");
            if (!rotated.isEmpty() && !rotated.equals(refreshToken) && p.getBoolean("enabled", false))
                p.edit().putString("encrypted", encrypt(rotated)).apply();
            for (int count = 0; count < 20 && p.getBoolean("enabled", false); count++) {
                JSONObject ev = next(c);
                if (ev == null) break;
                // Measure only duration/result; never send the domain or room code to Performance.
                NativePerformance.Ticket upload = NativePerformance.begin(c,"family_upload");
                int http;
                try { http = send(idToken, uid, room, ev.getString("id"), ev.getString("domain")); }
                catch (Exception ex) { NativePerformance.finish(c, upload, false); throw ex; }
                NativePerformance.finish(c, upload, (http>=200&&http<300)||http==409||http==412);
                if (http >= 200 && http < 300 || http == 409 || http == 412) {
                    remove(c, ev.getString("id"));
                    p.edit().putLong("last_sent", System.currentTimeMillis()).remove("error").apply();
                } else { error(c, "HTTP_" + http); break; }
            }
        } catch (Exception e) { error(c, "RED_O_SESION_NO_DISPONIBLE"); }
        finally { BUSY.set(false); }
    }
    private static JSONObject refresh(String token) throws Exception {
        String encoded = "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(token, "UTF-8");
        Response r = request("https://securetoken.googleapis.com/v1/token?key=" + PUBLIC_API_KEY,
            "application/x-www-form-urlencoded", encoded, null);
        if (r.code < 200 || r.code >= 300) throw new IllegalStateException("AUTH_" + r.code);
        return new JSONObject(r.body);
    }
    private static int send(String token, String uid, String room, String id, String domain) throws Exception {
        String path = "projects/" + PROJECT + "/databases/(default)/documents/family_rooms/" + room + "/risk_events/" + id;
        JSONObject fields = new JSONObject()
            .put("memberUid", new JSONObject().put("stringValue", uid))
            .put("domain", new JSONObject().put("stringValue", domain))
            .put("color", new JSONObject().put("stringValue", "red"))
            .put("source", new JSONObject().put("stringValue", "notification"))
            .put("engineVersion", new JSONObject().put("stringValue", "0.6.0"));
        JSONObject write = new JSONObject().put("update", new JSONObject().put("name", path).put("fields", fields))
            .put("updateTransforms", new JSONArray().put(new JSONObject()
                .put("fieldPath", "createdAt").put("setToServerValue", "REQUEST_TIME")))
            .put("currentDocument", new JSONObject().put("exists", false));
        JSONObject payload = new JSONObject().put("writes", new JSONArray().put(write));
        Response resp = request("https://firestore.googleapis.com/v1/projects/" + PROJECT + "/databases/(default)/documents:commit",
            "application/json", payload.toString(), token);
        return resp.code;
    }
    private static final class Response { final int code; final String body; Response(int c, String b) { code = c; body = b; } }
    private static Response request(String url, String type, String body, String token) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        try {
            conn.setRequestMethod("POST"); conn.setConnectTimeout(12000); conn.setReadTimeout(18000);
            conn.setUseCaches(false); conn.setDoOutput(true); conn.setRequestProperty("Content-Type", type);
            if (token != null) conn.setRequestProperty("Authorization", "Bearer " + token);
            byte[] data = body.getBytes(StandardCharsets.UTF_8); conn.setFixedLengthStreamingMode(data.length);
            try (OutputStream out = conn.getOutputStream()) { out.write(data); }
            int status = conn.getResponseCode();
            InputStream stream = status >= 200 && status < 400 ? conn.getInputStream() : conn.getErrorStream();
            ByteArrayOutputStream read = new ByteArrayOutputStream();
            if (stream != null) try (InputStream input = stream) {
                byte[] buf = new byte[4096]; int n;
                while ((n = input.read(buf)) != -1 && read.size() < 32768) read.write(buf, 0, n);
            }
            return new Response(status, read.toString("UTF-8"));
        } finally { conn.disconnect(); }
    }
    private static String hashLocal(Context c, String source) throws Exception {
        SharedPreferences p = pref(c);
        String salt = p.getString("hash_salt", "");
        if (salt.isEmpty()) { byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes);
            salt = Base64.encodeToString(bytes, Base64.NO_WRAP | Base64.NO_PADDING | Base64.URL_SAFE);
            p.edit().putString("hash_salt", salt).apply(); }
        MessageDigest sha = MessageDigest.getInstance("SHA-256");
        byte[] dig = sha.digest((salt + "|" + source).getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : dig) sb.append(String.format(Locale.ROOT, "%02x", b & 0xff));
        return sb.toString();
    }
    private static SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if (store.containsAlias(KEY_ALIAS)) return ((KeyStore.SecretKeyEntry) store.getEntry(KEY_ALIAS, null)).getSecretKey();
        KeyGenerator gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        gen.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true).build());
        return gen.generateKey();
    }
    private static String encrypt(String text) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key());
        byte[] iv = cipher.getIV(), data = cipher.doFinal(text.getBytes(StandardCharsets.UTF_8));
        byte[] result = new byte[iv.length + data.length];
        System.arraycopy(iv, 0, result, 0, iv.length); System.arraycopy(data, 0, result, iv.length, data.length);
        return Base64.encodeToString(result, Base64.NO_WRAP);
    }
    private static String decrypt(String encoded) throws Exception {
        byte[] blob = Base64.decode(encoded, Base64.DEFAULT);
        if (blob.length < 29) return null;
        byte[] iv = new byte[12]; System.arraycopy(blob, 0, iv, 0, 12);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
        return new String(cipher.doFinal(blob, 12, blob.length-12), StandardCharsets.UTF_8);
    }
}
