package co.antesdeabrir.piloto;

import android.Manifest;
import android.content.*;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import org.json.JSONObject;

@CapacitorPlugin(name="Protection", permissions={@Permission(alias="alerts",strings={Manifest.permission.POST_NOTIFICATIONS})})
public class ProtectionPlugin extends Plugin {
    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("smartguard_protection",Context.MODE_PRIVATE); }
    @PluginMethod public void status(PluginCall call) {
        Context c=getContext(); SharedPreferences p=prefs(c);
        JSObject r=new JSObject();
        r.put("enabled",p.getBoolean("enabled",false));
        r.put("access",NotificationManagerCompat.getEnabledListenerPackages(c).contains(c.getPackageName()));
        r.put("notifications",NotificationManagerCompat.from(c).areNotificationsEnabled());
        r.put("showAll",p.getBoolean("showAll",true));r.put("processed",p.getInt("processed",0));r.put("lastAt",p.getLong("lastAt",0));
        JSObject apps=new JSObject();for(String app:new String[]{"sms","whatsapp","telegram","signal","messenger"})apps.put(app,p.getBoolean("app_"+app,app.equals("sms")||app.equals("whatsapp")));
        r.put("apps",apps);r.put("historyEnabled",p.getBoolean("historyEnabled",false));
        try{r.put("history",new org.json.JSONArray(p.getString("history","[]")));r.put("feedbackCount",new org.json.JSONArray(p.getString("feedback","[]")).length());
            r.put("externalReady",new JSONObject(EngineRunner.asset(c,"backend.json",8192)).optBoolean("threatEnabled",false));
        }catch(Exception e){r.put("history",new org.json.JSONArray());r.put("feedbackCount",0);r.put("externalReady",false);}
        r.put("rulesVersion","0.4.0 · catálogo integrado");call.resolve(r);
    }
    @PluginMethod public void activate(PluginCall call) {
        prefs(getContext()).edit().putBoolean("enabled",true).putLong("epoch",System.currentTimeMillis()).apply(); Alerts.channel(getContext());
        if(Build.VERSION.SDK_INT>=33 && getPermissionState("alerts")!=PermissionState.GRANTED) {
            requestPermissionForAlias("alerts",call,"afterPermission"); return;
        }
        openListener(); call.resolve();
    }
    @PermissionCallback private void afterPermission(PluginCall call) { openListener();call.resolve(); }
    private void openListener() {
        if(!NotificationManagerCompat.getEnabledListenerPackages(getContext()).contains(getContext().getPackageName()))
            getActivity().startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
    }
    @PluginMethod public void pause(PluginCall call) { prefs(getContext()).edit().putBoolean("enabled",false).putLong("epoch",System.currentTimeMillis()).apply();Alerts.clear(getContext());call.resolve(); }
    @PluginMethod public void alertSettings(PluginCall call) { getActivity().startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getContext().getPackageName()));call.resolve(); }
    @PluginMethod public void setApp(PluginCall call) {
        String app=call.getString("app","");if(!java.util.Arrays.asList("sms","whatsapp","telegram","signal","messenger").contains(app)){call.reject("Aplicación no compatible");return;}
        prefs(getContext()).edit().putBoolean("app_"+app,Boolean.TRUE.equals(call.getBoolean("value"))).apply();call.resolve();
    }
    @PluginMethod public void setHistory(PluginCall call) {boolean enabled=Boolean.TRUE.equals(call.getBoolean("value"));android.content.SharedPreferences.Editor edit=prefs(getContext()).edit().putBoolean("historyEnabled",enabled);if(!enabled)edit.remove("history");edit.apply();call.resolve();}
    @PluginMethod public void clearHistory(PluginCall call) {prefs(getContext()).edit().remove("history").remove("feedback").apply();call.resolve();}
    @PluginMethod public void reportResult(PluginCall call) {
        String expected=call.getString("expected","");int id=call.getInt("id",-1);
        if(!java.util.Arrays.asList("legitimate","suspicious").contains(expected)){call.reject("Corrección inválida");return;}
        JSONObject detail=Alerts.get(id);if(detail==null||detail.optBoolean("test")){call.reject("Resultado no disponible");return;}
        try{String host=new java.net.URI(detail.optString("url")).getHost();if(host==null)throw new Exception();
            org.json.JSONArray previous=new org.json.JSONArray(prefs(getContext()).getString("feedback","[]")), next=new org.json.JSONArray();
            next.put(new JSONObject().put("domain",host).put("expected",expected).put("date",System.currentTimeMillis()).put("color",detail.optJSONObject("decision").optString("color")));
            for(int i=0;i<previous.length()&&next.length()<50;i++)next.put(previous.get(i));
            prefs(getContext()).edit().putString("feedback",next.toString()).apply();call.resolve();
        }catch(Exception e){call.reject("No se pudo guardar la corrección");}
    }
    @PluginMethod public void exportFeedback(PluginCall call) {getContext().getSystemService(ClipboardManager.class).setPrimaryClip(ClipData.newPlainText("Correcciones SmartGuard",prefs(getContext()).getString("feedback","[]")));call.resolve();}
    @PluginMethod public void setShowAll(PluginCall call) { prefs(getContext()).edit().putBoolean("showAll",Boolean.TRUE.equals(call.getBoolean("value"))).apply();call.resolve(); }
    @PluginMethod public void testBanner(PluginCall call) { Alerts.preview(getContext(),call.getString("level","precaucion"));call.resolve(); }
    @PluginMethod public void openedAnalysis(PluginCall call) {
        JSObject r=new JSObject(); JSONObject d=null;
        String raw=getActivity().getIntent().getStringExtra(Alerts.EXTRA);
        try { if(raw!=null && raw.length()<65536) { d=new JSONObject(raw);int id=d.optInt("id");JSONObject recent=Alerts.get(id);if(recent!=null)d=recent;synchronized(Alerts.class){ Alerts.opened=id; } } }
        catch(Exception ignored) { }
        r.put("detail",d==null?JSONObject.NULL:d);call.resolve(r);
    }
    @PluginMethod public void recheckAnalysis(PluginCall call) {
        int id=call.getInt("id",-1);JSONObject old=Alerts.get(id);
        if(old==null||old.optBoolean("test")){call.reject("Resultado no disponible");return;}
        String url=old.optString("url");org.json.JSONArray findings=old.optJSONArray("messageSignals");
        EngineRunner.analyze(getContext(),url,null,"",new JSONObject(),findings,local->{
            if(local==null){call.reject("No se pudo analizar localmente");return;}
            if(local.optJSONObject("privacy")!=null&&local.optJSONObject("privacy").optBoolean("sensitive")){Alerts.result(getContext(),id,local,false);call.resolve();return;}
            new Thread(()->{
                JSONObject destination=DestinationClient.check(getContext(),url), extra=destination.optJSONObject("_checks");destination.remove("_checks");if(extra==null)extra=new JSONObject();
                EngineRunner.analyze(getContext(),url,destination,"",extra,findings,result->{if(result==null){call.reject("No se pudo completar el análisis");return;}Alerts.result(getContext(),id,result,false);call.resolve();});
            },"smartguard-recheck").start();
        });
    }
    @PluginMethod public void closeAnalysis(PluginCall call) { getActivity().getIntent().removeExtra(Alerts.EXTRA);call.resolve(); }
    @PluginMethod public void copyDomain(PluginCall call) {
        String domain=call.getString("domain","");
        if(domain.isEmpty()||domain.length()>253||domain.contains("/")||domain.contains(" ")) { call.reject("Dominio inválido");return; }
        getContext().getSystemService(ClipboardManager.class).setPrimaryClip(ClipData.newPlainText("Dominio",domain));call.resolve();
    }
}
