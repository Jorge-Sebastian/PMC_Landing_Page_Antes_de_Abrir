package co.antesdeabrir.piloto;

import android.content.Context;
import org.json.*;
import java.io.*;
import java.net.*;
import javax.net.ssl.HttpsURLConnection;

/** Only contacts the configured analysis service, never the received URL directly. */
final class DestinationClient {
    private static final java.util.LinkedHashMap<String,CacheEntry> cache=new java.util.LinkedHashMap<>();
    static class CacheEntry {long until;String json;CacheEntry(String j,long expires){json=j;until=expires;}}
    static String cacheKey(String url) {try {byte[] bytes=java.security.MessageDigest.getInstance("SHA-256").digest(url.getBytes("UTF-8"));StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format("%02x",b));return s.toString();}catch(Exception e){return "";}}
    static JSONObject readJson(HttpsURLConnection connection,int limit) throws Exception {
        try(InputStream in=connection.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()) {byte[] buf=new byte[4096];int n;while((n=in.read(buf))!=-1){if(out.size()+n>limit)throw new IOException("Response too large");out.write(buf,0,n);}return new JSONObject(out.toString("UTF-8"));}
    }
    static String dns(String url) {
        HttpsURLConnection c=null;
        try {String host=new URI(url).getHost();if(host==null)return "unavailable";
            c=(HttpsURLConnection)new URL("https://dns.google/resolve?name="+java.net.URLEncoder.encode(host,"UTF-8")+"&type=A").openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(2500);c.setReadTimeout(2500);
            if(c.getResponseCode()!=200)return "unavailable";int status=readJson(c,65536).optInt("Status",-1);
            return status==3?"not-found":status==0?"exists":"unavailable";
        }catch(Exception e){return "unavailable";}finally{if(c!=null)c.disconnect();}
    }
    static JSONObject reputation(Context context,String url,JSONObject config) {
        HttpsURLConnection c=null;
        try {
            if(!config.optBoolean("threatEnabled",false))return new JSONObject().put("checks",new JSONArray().put(new JSONObject().put("name","Fuentes de amenazas").put("status","not-configured")));
            c=(HttpsURLConnection)new URL(config.getString("url")+"/functions/v1/check-threats").openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(3000);c.setReadTimeout(7000);c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");c.setRequestProperty("apikey",config.getString("key"));
            if(config.getString("key").startsWith("eyJ"))c.setRequestProperty("Authorization","Bearer "+config.getString("key"));
            try(OutputStream out=c.getOutputStream()){out.write(new JSONObject().put("url",url).toString().getBytes("UTF-8"));}
            if(c.getResponseCode()!=200)throw new IOException();JSONObject result=readJson(c,65536);JSONArray sources=result.optJSONArray("checks");if(sources==null||sources.length()>12)throw new IOException();
            for(int i=0;i<sources.length();i++){JSONObject source=sources.getJSONObject(i);if(!java.util.Arrays.asList("clear","match","unavailable","not-configured","skipped").contains(source.optString("status")))throw new IOException();}
            return result;
        }catch(Exception e){try{return new JSONObject().put("checks",new JSONArray().put(new JSONObject().put("name","Fuentes de amenazas").put("status","unavailable")));}catch(Exception ignored){return new JSONObject();}}
        finally{if(c!=null)c.disconnect();}
    }
    static JSONObject check(Context c,String url) {
        String key=cacheKey(url);synchronized(cache){CacheEntry hit=cache.get(key);if(hit!=null&&hit.until>System.currentTimeMillis())try{JSONObject result=new JSONObject(hit.json);result.getJSONObject("_checks").put("cached",true);return result;}catch(Exception ignored){}}
        JSONObject result=new JSONObject(), extra=new JSONObject();
        try {JSONObject config=new JSONObject(EngineRunner.asset(c,"backend.json",8192));
            java.util.concurrent.CompletableFuture<JSONObject> destinationTask=java.util.concurrent.CompletableFuture.supplyAsync(()->destination(c,url));
            java.util.concurrent.CompletableFuture<String> dnsTask=java.util.concurrent.CompletableFuture.supplyAsync(()->dns(url));
            java.util.concurrent.CompletableFuture<JSONObject> reputationTask=java.util.concurrent.CompletableFuture.supplyAsync(()->reputation(c,url,config));
            result=destinationTask.get(15,java.util.concurrent.TimeUnit.SECONDS);
            extra.put("dns",dnsTask.get(6,java.util.concurrent.TimeUnit.SECONDS)).put("reputation",reputationTask.get(8,java.util.concurrent.TimeUnit.SECONDS)).put("checkedAt",System.currentTimeMillis()).put("cached",false);
            result.put("_checks",extra);
            long expiry=System.currentTimeMillis()+45000;
            JSONArray checks=extra.getJSONObject("reputation").optJSONArray("checks");
            if(checks!=null)for(int i=0;i<checks.length();i++){JSONObject source=checks.getJSONObject(i);if(source.optString("status").equals("unavailable"))expiry=0;if(source.has("expiresAt"))try{expiry=Math.min(expiry,java.time.Instant.parse(source.getString("expiresAt")).toEpochMilli());}catch(Exception e){expiry=0;}}
            if(expiry>System.currentTimeMillis()&&result.optBoolean("checked")&&result.optBoolean("reachable"))synchronized(cache){cache.put(key,new CacheEntry(result.toString(),expiry));while(cache.size()>100)cache.remove(cache.keySet().iterator().next());}
        }catch(Exception ignored){}
        return result;
    }
    static JSONObject destination(Context c,String url) {
        HttpsURLConnection connection=null;
        try {
            JSONObject config=new JSONObject(EngineRunner.asset(c,"backend.json",8192));
            URL endpoint=new URL(config.getString("url")+"/functions/v1/check-link");
            if(!endpoint.getProtocol().equals("https"))throw new IOException("HTTPS required");
            connection=(HttpsURLConnection)endpoint.openConnection();connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(4000);connection.setReadTimeout(10000);connection.setRequestMethod("POST");connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type","application/json");connection.setRequestProperty("apikey",config.getString("key"));
            if(config.getString("key").startsWith("eyJ"))connection.setRequestProperty("Authorization","Bearer "+config.getString("key"));
            try(OutputStream out=connection.getOutputStream()){out.write(new JSONObject().put("url",url).toString().getBytes("UTF-8"));}
            if(connection.getResponseCode()!=200)throw new IOException("Service unavailable");
            String text;
            try(InputStream in=connection.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()) {
                byte[] buf=new byte[4096];int n;while((n=in.read(buf))!=-1){if(out.size()+n>65536)throw new IOException("Response too large");out.write(buf,0,n);}text=out.toString("UTF-8");
            }
            JSONObject result=new JSONObject(text);
            result.put("checked",result.optBoolean("ok"));
            if(!result.optBoolean("checked"))result.put("reason",result.optString("reason","unavailable"));
            return result;
        }catch(Exception e){try{return new JSONObject().put("checked",false).put("reason","unavailable");}catch(JSONException ignored){return new JSONObject();}}
        finally{if(connection!=null)connection.disconnect();}
    }
}
