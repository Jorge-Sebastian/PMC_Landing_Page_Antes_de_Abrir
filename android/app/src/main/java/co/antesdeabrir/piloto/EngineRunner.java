package co.antesdeabrir.piloto;

import android.content.Context;
import android.os.*;
import android.webkit.*;
import org.json.*;
import java.io.*;
import java.util.*;

/** Local shared JS, isolated from the visible activity. No remote WebView content. */
final class EngineRunner {
    interface Done { void complete(JSONObject result); }
    static final Handler main=new Handler(Looper.getMainLooper());
    static WebView view;
    static boolean ready=false;
    static final ArrayList<Runnable> waiting=new ArrayList<>();
    static String asset(Context c,String path,int max) throws IOException {
        try(InputStream in=c.getAssets().open(path);ByteArrayOutputStream out=new ByteArrayOutputStream()) {
            byte[] buf=new byte[4096];int n;
            while((n=in.read(buf))!=-1) { if(out.size()+n>max)throw new IOException("Asset exceeds size limit");out.write(buf,0,n); }
            return out.toString("UTF-8");
        }
    }
    static void analyze(Context c,String url,JSONObject destination,Done done) { analyze(c,url,destination,"",new JSONObject(),done); }
    static void analyze(Context c,String url,JSONObject destination,String message,JSONObject extra,Done done) { analyze(c,url,destination,message,extra,null,done); }
    static void analyze(Context c,String url,JSONObject destination,String message,JSONObject extra,JSONArray previousFindings,Done done) {
        main.post(() -> {
            final boolean[] finished={false};
            Runnable timeout=()->{if(!finished[0]) { finished[0]=true;done.complete(null); }};
            main.postDelayed(timeout,8000);
            Runnable run=()->{
                if(finished[0])return;
                view.evaluateJavascript("JSON.stringify(PMCEngine.analyze("+JSONObject.quote(url)+","+(destination==null?"undefined":destination.toString())+","+JSONObject.quote(message)+","+extra.toString()+","+(previousFindings==null?"undefined":previousFindings.toString())+"))",result->{
                    if(finished[0])return;finished[0]=true;main.removeCallbacks(timeout);
                    try {Object decoded=new JSONTokener(result).nextValue();done.complete(new JSONObject((String)decoded));}
                    catch(Exception e) { done.complete(null); }
                });
            };
            if(ready) {run.run();return;}
            waiting.add(run);
            if(view!=null)return;
            try {
                view=new WebView(c.getApplicationContext());view.getSettings().setJavaScriptEnabled(true);
                view.getSettings().setBlockNetworkLoads(true);view.getSettings().setAllowFileAccess(false);view.getSettings().setAllowContentAccess(false);
                view.setWebViewClient(new WebViewClient(){@Override public void onPageFinished(WebView v,String u){ready=true;ArrayList<Runnable> jobs=new ArrayList<>(waiting);waiting.clear();for(Runnable job:jobs)job.run();}});
                view.loadDataWithBaseURL("https://engine.invalid/",asset(c,"shared-engine.html",2000000),"text/html","UTF-8",null);
            }catch(Exception e){waiting.clear();view=null;}
        });
    }
}
