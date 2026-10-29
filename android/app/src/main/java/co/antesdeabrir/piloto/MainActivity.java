package co.antesdeabrir.piloto;
import android.os.Bundle;
import android.content.Intent;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
 @Override public void onCreate(Bundle state) { registerPlugin(ProtectionPlugin.class);super.onCreate(state); }
 @Override protected void onNewIntent(Intent intent) { setIntent(intent);super.onNewIntent(intent); }
 @Override public void onBackPressed() { if(getIntent().hasExtra(Alerts.EXTRA)) {getIntent().removeExtra(Alerts.EXTRA);return;}super.onBackPressed(); }
}
