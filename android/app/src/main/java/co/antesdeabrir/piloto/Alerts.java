package co.antesdeabrir.piloto;

import android.app.*;
import android.content.*;
import android.graphics.*;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.*;
import java.util.*;

/** Three visible outcomes. Raw conversation text is never stored in notifications. */
final class Alerts {
    static final String CHANNEL="link_protection_v1", EXTRA="smartguard_detail";
    static final LinkedHashMap<Integer,JSONObject> details=new LinkedHashMap<>();
    static int opened=-1;
    static final LinkedHashMap<Integer,String> postedColors=new LinkedHashMap<>();
    static synchronized void remember(int id,JSONObject d){
        // Preserve verified Family results across a concurrent engine re-analysis.
        JSONObject old=details.get(id);
        if(old!=null && old!=d && d.optJSONArray("familyMatches")==null
                && d.optString("url").equals(old.optString("url"))) {
            JSONArray found=old.optJSONArray("familyMatches");
            if(found!=null && found.length()>0) try { d.put("familyMatches",found); } catch(Exception ignored){}
        }
        details.put(id,d);
        while(details.size()>30)details.remove(details.keySet().iterator().next());
    }
    static synchronized JSONObject get(int id){return details.get(id);}
    static void channel(Context c){
        if(Build.VERSION.SDK_INT>=26){NotificationChannel ch=new NotificationChannel(CHANNEL,"Alertas de SmartGuard",NotificationManager.IMPORTANCE_HIGH);ch.setDescription("Rojo: no lo abras. Naranja: precaución. Verde: sin alertas.");c.getSystemService(NotificationManager.class).createNotificationChannel(ch);}
    }
    static void pending(Context c,int id,String url){
        try{
            synchronized(Alerts.class){if(opened==id)opened=-1;}
            JSONObject d=new JSONObject().put("id",id).put("pending",true).put("test",false).put("url",url);
            d.put("decision",new JSONObject().put("color","orange").put("title","Revisando enlace…").put("summary","El resultado aparecerá en este mismo aviso."));
            d.put("familyLookupPending", FirebaseFamilyReporter.hasLinkedRoom(c));
            show(c,id,d,false);
        }catch(JSONException ignored){}
    }
    /** Adds verified family history to the same notification and in-app detail. */
    static void familyLookupFinished(Context c, int id, String url, JSONArray matches) {
        JSONObject current;
        synchronized(Alerts.class) {
            current=details.get(id);
            if(current==null || current.optBoolean("test") || !url.equals(current.optString("url"))) return;
            try {
                current.put("familyLookupPending", false);
                if (matches != null && matches.length() > 0) current.put("familyMatches", matches);
            } catch(Exception ignored){ return; }
            details.put(id,current);
        }
        // Update the SAME notification, without sounding again. If no match was
        // verified, restore the normal engine explanation immediately.
        if (!current.optBoolean("pending")) show(c,id,current,true);
    }
    static void result(Context c,int id,JSONObject d,boolean test){
        try{
            d.put("id",id).put("pending",false).put("test",test);
            synchronized(Alerts.class) {
                JSONObject previous=details.get(id);
                if(previous!=null && !test && d.optString("url").equals(previous.optString("url"))) {
                    JSONArray related=previous.optJSONArray("familyMatches");
                    if(related!=null && related.length()>0) d.put("familyMatches",related);
                    if(previous.optBoolean("familyLookupPending")) d.put("familyLookupPending", true);
                }
            }
            if(d.optJSONObject("decision")==null)d.put("decision",new JSONObject().put("color","orange").put("title","Ten precaución").put("summary","Confirma el origen antes de abrir este enlace.").put("recommendation","La revisión quedó limitada; verifica desde una aplicación o contacto conocido."));
            boolean green="green".equals(d.getJSONObject("decision").optString("color"));
            remember(id,d);
            if(!test&&!d.optBoolean("interim"))saveHistory(c,id,d);
            if(!test&&green&&d.optJSONArray("familyMatches")==null&&!ProtectionPlugin.prefs(c).getBoolean("showAll",true)){c.getSystemService(NotificationManager.class).cancel(id);return;}
            show(c,id,d,!test);
        }catch(JSONException ignored){}
    }
    static synchronized void saveHistory(Context c,int id,JSONObject d){
        android.content.SharedPreferences p=ProtectionPlugin.prefs(c);
        if(!p.getBoolean("historyEnabled",false))return;
        try{
            String host=new java.net.URI(d.optString("url")).getHost();if(host==null)return;
            JSONArray previous=new JSONArray(p.getString("history","[]")), next=new JSONArray();
            next.put(new JSONObject().put("id",id).put("domain",host).put("color",d.getJSONObject("decision").optString("color")).put("date",System.currentTimeMillis()));
            for(int i=0;i<previous.length()&&next.length()<50;i++)if(previous.getJSONObject(i).optInt("id")!=id)next.put(previous.getJSONObject(i));
            p.edit().putString("history",next.toString()).apply();
        }catch(Exception ignored){}
    }
    static Bitmap statusIcon(String color){
        int rgb=Color.parseColor(color.equals("red")?"#B42318":color.equals("green")?"#147D45":"#C66B00");
        Bitmap b=Bitmap.createBitmap(96,96,Bitmap.Config.ARGB_8888);Canvas canvas=new Canvas(b);Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(rgb);canvas.drawCircle(48,48,44,p);p.setColor(Color.WHITE);p.setTextSize(62);p.setTypeface(Typeface.DEFAULT_BOLD);p.setTextAlign(Paint.Align.CENTER);
        canvas.drawText(color.equals("green")?"✓":color.equals("red")?"×":"!",48,69,p);return b;
    }
    static void show(Context c,int id,JSONObject d,boolean update){
        remember(id,d);channel(c);synchronized(Alerts.class){if(opened==id)return;}
        if(!NotificationManagerCompat.from(c).areNotificationsEnabled())return;
        JSONObject decision=d.optJSONObject("decision");if(decision==null)return;
        String color=decision.optString("color","orange");
        boolean alertAgain=false;
        synchronized(Alerts.class){alertAgain=update&&color.equals("red")&&!color.equals(postedColors.get(id));postedColors.put(id,color);while(postedColors.size()>100)postedColors.remove(postedColors.keySet().iterator().next());}
        String title=decision.optString("title","Ten precaución"),summary=decision.optString("summary","Confirma el origen del mensaje.");
        String symbol=color.equals("green")?"✓ ":color.equals("red")?"⛔ ":"⚠ ";
        JSONArray related=d.optJSONArray("familyMatches");
        boolean hasFamily=related!=null && related.length()>0;
        String familyHeading="",familyExplanation="";
        if(hasFamily) {
            JSONObject match=related.optJSONObject(0);
            if(match!=null) {
                String nickname=match.optString("memberNickname","un familiar");
                String domain=match.optString("registrableDomain","");
                if("same-domain".equals(match.optString("kind"))) {
                    familyHeading="ALERTA FAMILIAR · " + nickname;
                    familyExplanation="También le llegó a " + nickname + " un enlace del dominio " + domain
                        + " y fue reportado como peligroso. Coincide el dominio; no necesariamente la URL completa.";
                } else {
                    familyHeading="ALERTA FAMILIAR · DOMINIO PARECIDO";
                    familyExplanation="Este dominio se parece a " + domain + ", reportado previamente por "
                        + nickname + ". La semejanza no demuestra que sea el mismo enlace.";
                }
                title=familyHeading;summary=familyExplanation;
            }
        }
        String originalSummary=decision.optString("summary","Confirma el origen del mensaje.");
        if (!hasFamily && d.optBoolean("familyLookupPending") && !d.optBoolean("pending")) {
            title="red".equals(color) ? "No lo abras · verificando familia" : "Verificando alertas de tu familia";
            summary="Consultando si otro integrante recibió este dominio. " + ("red".equals(color) ? "Riesgo detectado." : "El análisis continúa.");
        }
        StringBuilder expanded=new StringBuilder();
        if(hasFamily) expanded.append(familyExplanation).append("\n\nAnálisis de SmartGuard: ");
        expanded.append(originalSummary).append("\n\n");
        String host="";try{host=new java.net.URI(d.optString("url")).getHost();}catch(Exception ignored){}
        expanded.append("Dominio: ").append(host).append("\n");
        JSONObject destination=d.optJSONObject("destination");
        if(destination!=null&&destination.optBoolean("differentHost"))expanded.append("Destino real: ").append(destination.optString("finalHost")).append("\n");
        JSONObject verdict=d.optJSONObject("verdict");JSONArray link=verdict==null?null:verdict.optJSONArray("signals"),message=d.optJSONArray("messageSignals");
        int count=0;
        for(JSONArray list:new JSONArray[]{message,link})if(list!=null)for(int i=0;i<list.length()&&count<3;i++){
            JSONObject s=list.optJSONObject(i);if(s==null)continue;count++;
            expanded.append("\n• ").append(s.optString("title")).append("\n").append(s.optString("explanation")).append("\n");
        }
        expanded.append("\n").append(decision.optString("recommendation")).append("\n").append(decision.optString("coverage"));
        // The tap opens the exact in-app analysis; never follow the suspicious URL.
        Intent intent=new Intent(c,MainActivity.class).setAction("smartguard.detail."+id)
            .setPackage(c.getPackageName())
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if(d.toString().length()<60000)intent.putExtra(EXTRA,d.toString());
        PendingIntent open=PendingIntent.getActivity(c,id,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification n=new NotificationCompat.Builder(c,CHANNEL).setSmallIcon(R.drawable.ic_protection).setLargeIcon(statusIcon(color))
            .setContentTitle((d.optBoolean("test")?"PRUEBA · ":"")+symbol+title).setContentText(summary)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(expanded.toString()))
            .setContentIntent(open).addAction(0,hasFamily?"Ver alerta familiar":"Ver motivos",open).setAutoCancel(true).setOnlyAlertOnce(update&&!alertAgain)
            .setPriority(NotificationCompat.PRIORITY_HIGH).setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setColor(Color.parseColor(color.equals("red")?"#B42318":color.equals("green")?"#147D45":"#C66B00")).build();
        try{NotificationManagerCompat.from(c).notify(id,n);}catch(SecurityException ignored){}
    }
    static void preview(Context c,String color){
        if(!Arrays.asList("red","orange","green").contains(color))color="orange";
        try{
            String title=color.equals("red")?"No lo abras":color.equals("green")?"Sin alertas":"Ten precaución";
            String summary=color.equals("red")?"Ejemplo: imita a una empresa y usa otro dominio.":color.equals("green")?"Ejemplo: no se detectaron señales de riesgo.":"Ejemplo: solicita un pago urgente; confirma con la empresa.";
            JSONObject d=new JSONObject().put("url","https://example.com").put("decision",new JSONObject().put("color",color).put("title",title).put("summary",summary).put("recommendation","Este es un aviso simulado; no se recibió ni analizó un SMS real.").put("checks",new JSONArray()).put("coverage","Prueba simulada: no se consultaron fuentes externas."));
            result(c,9000+Math.abs(color.hashCode()%1000),d,true);
        }catch(JSONException ignored){}
    }
    static synchronized void clear(Context c){details.clear();postedColors.clear();opened=-1;c.getSystemService(NotificationManager.class).cancelAll();}
}
