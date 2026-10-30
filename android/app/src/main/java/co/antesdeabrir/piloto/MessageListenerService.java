package co.antesdeabrir.piloto;

import android.app.Notification;
import android.os.*;
import android.provider.Telephony;
import android.service.notification.*;
import org.json.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.*;

/** Reads links only from compatible notifications after explicit user permission. */
public class MessageListenerService extends NotificationListenerService {
    private final LinkedHashMap<String,Long> recent=new LinkedHashMap<>();
    private final ThreadPoolExecutor network=new ThreadPoolExecutor(2,2,30,TimeUnit.SECONDS,new ArrayBlockingQueue<>(20),new ThreadPoolExecutor.AbortPolicy());
    @Override public void onListenerConnected() {
        super.onListenerConnected();
        FirebaseBackgroundTelemetry.schedule(this);
    }
    @Override public void onListenerDisconnected() {
        super.onListenerDisconnected();
    }
    private void recordFinal(JSONObject result,String uniqueSource,long occurredAt) {
        JSONObject decision = result == null ? null : result.optJSONObject("decision");
        String color = decision == null ? "" : decision.optString("color","");
        FirebaseBackgroundTelemetry.record(this,color,occurredAt,"0.5.9",uniqueSource);
    }
    static final Pattern URLS=Pattern.compile("https?://[^\\s<>\\\"]+",Pattern.CASE_INSENSITIVE);
    static final Pattern BARE=Pattern.compile("(?<![@\\w])(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}(?:/[^\\s<>\\\"]*)?");
    @Override public void onNotificationPosted(StatusBarNotification sbn) {
        if(!ProtectionPlugin.prefs(this).getBoolean("enabled",false))return;
        String p=sbn.getPackageName();String sms=Telephony.Sms.getDefaultSmsPackage(this);
        android.content.SharedPreferences preferences=ProtectionPlugin.prefs(this);
        boolean compatible=(p.equals(sms)||p.equals("com.google.android.apps.messaging")||p.equals("com.samsung.android.messaging"))&&preferences.getBoolean("app_sms",true)
            ||(p.equals("com.whatsapp")||p.equals("com.whatsapp.w4b"))&&preferences.getBoolean("app_whatsapp",true)
            ||p.equals("org.telegram.messenger")&&preferences.getBoolean("app_telegram",false)
            ||p.equals("org.thoughtcrime.securesms")&&preferences.getBoolean("app_signal",false)
            ||p.equals("com.facebook.orca")&&preferences.getBoolean("app_messenger",false);
        if(!compatible)return;
        Notification n=sbn.getNotification();if((n.flags&Notification.FLAG_GROUP_SUMMARY)!=0)return;
        Bundle extras=n.extras;if(extras==null)return;
        CharSequence text=extras.getCharSequence(Notification.EXTRA_BIG_TEXT);if(text==null)text=extras.getCharSequence(Notification.EXTRA_TEXT);
        Parcelable[] messages=extras.getParcelableArray("android.messages");
        if(messages!=null&&messages.length>0&&messages[messages.length-1] instanceof Bundle)text=((Bundle)messages[messages.length-1]).getCharSequence("text");
        if(text==null||text.length()>16384)return;
        LinkedHashSet<String> urls=new LinkedHashSet<>();Matcher m=URLS.matcher(text);
        while(m.find()&&urls.size()<10)urls.add(m.group().replaceAll("[.,;!?)]+$",""));
        if(urls.isEmpty()){m=BARE.matcher(text);while(m.find()&&urls.size()<10)urls.add("https://"+m.group().replaceAll("[.,;!?)]+$",""));}
        final String message=text.toString();
        final long epoch=preferences.getLong("epoch",0);
        for(String url:urls){
            String key=DestinationClient.cacheKey(p+"\n"+url+"\n"+message);long now=System.currentTimeMillis();
            final String stableSource = p+"|"+sbn.getKey()+"|"+sbn.getPostTime()+"|"+url;
            final long eventTime = now;
            synchronized(recent){Long last=recent.get(key);if(last!=null&&now-last<120000)continue;recent.put(key,now);while(recent.size()>500)recent.remove(recent.keySet().iterator().next());}
            int id=1000+(key.hashCode()&0x3fffffff);
            Alerts.pending(this,id,url);
            android.content.SharedPreferences pref=ProtectionPlugin.prefs(this);
            pref.edit().putInt("processed",pref.getInt("processed",0)+1).putLong("lastAt",now).apply();
            EngineRunner.analyze(this,url,null,message,new JSONObject(),local->{
                if(!active(epoch))return;
                if(local==null){try{Alerts.result(this,id,new JSONObject().put("url",url),false);}catch(Exception ignored){}return;}
                JSONObject privacy=local.optJSONObject("privacy");
                if(privacy!=null&&privacy.optBoolean("sensitive")){Alerts.result(this,id,local,false);recordFinal(local,stableSource,eventTime);return;}
                JSONObject decision=local.optJSONObject("decision");
                if(decision!=null&&decision.optString("color").equals("red"))try{local.put("interim",true);Alerts.result(this,id,local,false);}catch(Exception ignored){}
                try{network.execute(()->{
                    if(!active(epoch))return;
                    JSONObject destination=DestinationClient.check(this,url);
                    JSONObject extra=destination.optJSONObject("_checks");if(extra==null)extra=new JSONObject();destination.remove("_checks");
                    EngineRunner.analyze(this,url,destination,message,extra,result->{
                        if(!active(epoch))return;
                        if(result==null){try{result=new JSONObject().put("url",url).put("destination",destination);}catch(Exception ignored){return;}}
                        Alerts.result(this,id,result,false);
                        recordFinal(result,stableSource,eventTime);
                    });
                });}catch(RejectedExecutionException e){Alerts.result(this,id,local,false);recordFinal(local,stableSource,eventTime);}
            });
        }
    }
    private boolean active(long epoch){android.content.SharedPreferences p=ProtectionPlugin.prefs(this);return p.getBoolean("enabled",false)&&p.getLong("epoch",0)==epoch;}
    @Override public void onDestroy(){network.shutdownNow();super.onDestroy();}
}
