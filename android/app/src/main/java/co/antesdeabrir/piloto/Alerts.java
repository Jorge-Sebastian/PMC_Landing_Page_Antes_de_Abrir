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
    static synchronized void remember(int id,JSONObject d){details.put(id,d);while(details.size()>30)details.remove(details.keySet().iterator().next());}
    static synchronized JSONObject get(int id){return details.get(id);}
    static void channel(Context c){
        if(Build.VERSION.SDK_INT>=26){NotificationChannel ch=new NotificationChannel(CHANNEL,"Alertas de SmartGuard",NotificationManager.IMPORTANCE_HIGH);ch.setDescription("Rojo: no lo abras. Naranja: precaución. Verde: sin alertas.");c.getSystemService(NotificationManager.class).createNotificationChannel(ch);}
    }
    static void pending(Context c,int id,String url){
        try{
            synchronized(Alerts.class){if(opened==id)opened=-1;}
            JSONObject d=new JSONObject().put("id",id).put("pending",true).put("test",false).put("url",url);
            d.put("decision",new JSONObject().put("color","orange").put("title","Revisando enlace…").put("summary","El resultado aparecerá en este mismo aviso."));
            show(c,id,d,false);
        }catch(JSONException ignored){}
    }
    static void result(Context c,int id,JSONObject d,boolean test){
        try{
            d.put("id",id).put("pending",false).put("test",test);
            if(d.optJSONObject("decision")==null)d.put("decision",new JSONObject().put("color","orange").put("title","Ten precaución").put("summary","Confirma el origen antes de abrir este enlace.").put("recommendation","La revisión quedó limitada; verifica desde una aplicación o contacto conocido."));
            boolean green="green".equals(d.getJSONObject("decision").optString("color"));
            remember(id,d);
            if(!test&&!d.optBoolean("interim"))saveHistory(c,id,d);
            if(!test&&green&&!ProtectionPlugin.prefs(c).getBoolean("showAll",true)){c.getSystemService(NotificationManager.class).cancel(id);return;}
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
        StringBuilder expanded=new StringBuilder(summary).append("\n\n");
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
        Intent intent=new Intent(c,MainActivity.class).setAction("smartguard.detail."+id).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if(d.toString().length()<60000)intent.putExtra(EXTRA,d.toString());
        PendingIntent open=PendingIntent.getActivity(c,id,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification n=new NotificationCompat.Builder(c,CHANNEL).setSmallIcon(R.drawable.ic_protection).setLargeIcon(statusIcon(color))
            .setContentTitle((d.optBoolean("test")?"PRUEBA · ":"")+symbol+title).setContentText(summary)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(expanded.toString()))
            .setContentIntent(open).addAction(0,"Ver motivos",open).setAutoCancel(true).setOnlyAlertOnce(update&&!alertAgain)
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
