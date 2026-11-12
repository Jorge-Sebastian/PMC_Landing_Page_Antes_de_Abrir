package co.antesdeabrir.piloto;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.SystemClock;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * Consent-aware, LOCAL, privacy-minimized Android observability counters.
 * Only daily aggregate integers and coarse SDK version are exportable.
 * Neither event payload nor origin URL, message, contact, family member or device model is captured.
 * A heartbeat is a SAMPLE, never evidence of uninterrupted runtime between samples.
 */
public final class QualityAccumulator {
    private QualityAccumulator() {}
    private static final String PREF = "sg_quality_daily_v1";
    private static final long UPLOAD_INTERVAL_MS = 15 * 60 * 1000L;
    private static final int[] BIN_EDGES_MS = {100,200,300,500,800,1000,2000};
    private static final String[] COUNTERS = {"serviceChecks","healthyChecks","eligibleNotifications",
        "analysesOk","analysesFailed","alertsRequested","alertsPosted",
        "eventsGenerated","eventsAcked","eventsPending","syncFailures","syncRetries",
        "analysisDurationSumMs","analysisDurationCount","alertDurationSumMs","alertDurationCount"};
    private static SharedPreferences p(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }
    static String day(long epochMillis) {
        SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd",Locale.US);
        fmt.setTimeZone(TimeZone.getTimeZone("UTC"));
        return fmt.format(new Date(epochMillis));
    }
    static boolean allowedCounter(String key) {
        for (String v: COUNTERS) if (v.equals(key)) return true;
        return false;
    }
    public static synchronized void increment(Context c, String key) { add(c,key,1L); }
    public static synchronized void add(Context c, String key, long amount) {
        if (!allowedCounter(key) || amount < 0 || amount > 1000000) return;
        try {
            String day=day(System.currentTimeMillis());
            SharedPreferences pref=p(c);
            JSONObject o=new JSONObject(pref.getString("d_"+day,"{}"));
            o.put(key,Math.min(1000000000L,o.optLong(key,0)+amount));
            o.put("revision",o.optInt("revision",0)+1);
            pref.edit().putString("d_"+day,o.toString()).apply();
        } catch(Exception ignored) { /* Telemetry must not break phishing protection. */ }
    }
    /** Clear local quality history on revocation or a new consent session. */
    public static synchronized void clear(Context c) {
        SharedPreferences pref=p(c);
        SharedPreferences.Editor edit=pref.edit();
        for(String key:pref.getAll().keySet()) {
            if(key.startsWith("d_")||key.startsWith("sentrev_")||key.startsWith("sentat_")) edit.remove(key);
        }
        edit.apply();
    }
    /** Pending queue depth is a GAUGE; never add it across time. */
    public static synchronized void gauge(Context c, String key, long value) {
        if (!"eventsPending".equals(key) || value < 0 || value > 1000000) return;
        try {
            String day=day(System.currentTimeMillis());
            SharedPreferences pref=p(c);
            JSONObject o=new JSONObject(pref.getString("d_"+day,"{}"));
            if (o.optLong(key,-1)==value) return;
            o.put(key,value);o.put("revision",o.optInt("revision",0)+1);
            pref.edit().putString("d_"+day,o.toString()).apply();
        } catch(Exception ignored) {}
    }
    /** A monitored sample that does not imply continuous availability. */
    public static synchronized void sampleService(Context c) {
        boolean granted;
        try { granted=NotificationManagerCompat.getEnabledListenerPackages(c).contains(c.getPackageName())
            && NotificationManagerCompat.from(c).areNotificationsEnabled()
            && ProtectionPlugin.prefs(c).getBoolean("enabled",false);
        } catch(Exception ignored) { granted=false; }
        increment(c,"serviceChecks");
        if(granted)increment(c,"healthyChecks");
    }
    public static synchronized void duration(Context c, String kind, long elapsedMs) {
        if (!"analysis".equals(kind) && !"alert".equals(kind)) return;
        long ms=Math.max(0,Math.min(600000,elapsedMs));
        String day=day(System.currentTimeMillis());
        SharedPreferences pref=p(c);
        try {
            JSONObject o=new JSONObject(pref.getString("d_"+day,"{}"));
            o.put(kind+"DurationSumMs",Math.min(1000000000L,o.optLong(kind+"DurationSumMs",0)+ms));
            o.put(kind+"DurationCount",o.optLong(kind+"DurationCount",0)+1);
            JSONArray bins=o.optJSONArray(kind+"Bins");
            if(bins==null||bins.length()!=8) {
                bins=new JSONArray();for(int i=0;i<8;i++)bins.put(0);
            }
            int index=0;while(index<BIN_EDGES_MS.length && ms>BIN_EDGES_MS[index])index++;
            bins.put(index,bins.optInt(index,0)+1);
            o.put(kind+"Bins",bins);o.put("revision",o.optInt("revision",0)+1);
            pref.edit().putString("d_"+day,o.toString()).apply();
        } catch(Exception ignored) {}
    }
    /** True only for dirty days not sent recently; bounded to the last 8 UTC days. */
    public static synchronized List<String> daysToUpload(Context c) {
        List<String> days=new ArrayList<>();
        SharedPreferences pref=p(c);
        long now=System.currentTimeMillis();
        for(String key:pref.getAll().keySet()) {
            if(!key.matches("d_\\d{4}-\\d{2}-\\d{2}")) continue;
            String day=key.substring(2);
            try {
                SimpleDateFormat fmt=new SimpleDateFormat("yyyy-MM-dd",Locale.US);
                fmt.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date parsed=fmt.parse(day);
                if (parsed == null) continue;
                long utc=parsed.getTime();
                if(now-utc>9L*86400000L) {pref.edit().remove(key).apply();continue;}
                JSONObject o=new JSONObject(pref.getString(key,"{}"));
                int rev=o.optInt("revision",0);
                if(rev>pref.getInt("sentrev_"+day,0) && now-pref.getLong("sentat_"+day,0)>UPLOAD_INTERVAL_MS)days.add(day);
            } catch(Exception ignored) {}
        }
        Collections.sort(days);return days;
    }
    /** Serialized as Firestore REST fields by the already authenticated background sender. */
    public static synchronized JSONObject snapshot(Context c, String day) {
        try {
            JSONObject raw=new JSONObject(p(c).getString("d_"+day,"{}"));
            JSONObject out=new JSONObject();
            out.put("day",day);out.put("schemaVersion",1);
            out.put("sdkLevel", Build.VERSION.SDK_INT);
            out.put("revision",raw.optInt("revision",0));
            for(String key:COUNTERS)out.put(key,raw.optLong(key,0));
            for(String kind:new String[]{"analysis","alert"}){
                JSONArray b=raw.optJSONArray(kind+"Bins");if(b==null||b.length()!=8){b=new JSONArray();for(int i=0;i<8;i++)b.put(0);}
                out.put(kind+"Bins",b);
            }
            return out;
        } catch(Exception ignored) {return new JSONObject();}
    }
    public static synchronized void uploaded(Context c, String day, int revision) {
        p(c).edit().putInt("sentrev_"+day,revision).putLong("sentat_"+day,System.currentTimeMillis()).apply();
    }
    public static synchronized JSONObject status(Context c) {
        JSONObject out=new JSONObject();
        try {
            String day=day(System.currentTimeMillis());out.put("day",day);
            out.put("local",snapshot(c,day));out.put("unreportedDays",daysToUpload(c).size());
            out.put("explanation","Sampled service checks, not continuous uptime");
        } catch(Exception ignored) {}return out;
    }
}
