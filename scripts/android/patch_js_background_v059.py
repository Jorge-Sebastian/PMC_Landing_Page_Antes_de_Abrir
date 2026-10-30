"""Patch the 0.5.8 modern WebView integration to delegate future events to Android.

Does not touch the original message analyzer, login, Family or administrator.
All string anchors are asserted unique so we fail instead of patching an unknown UI.
"""
from pathlib import Path

def once(src, before, after):
    n=src.count(before)
    if n!=1: raise ValueError(f'Unsafe patch: {before[:95]!r} occurs {n} times')
    return src.replace(before,after,1)

def patch(src):
    assert src.count('const SGFirebaseBridgeV58 = () => {')==1, 'Expected 0.5.8 Firebase pilot'
    src=once(src,"  const version = '0.5.8';\n  const [approved", "  const version = '0.5.9';\n  const [approved")
    src=once(src,"version: '0.5.8-piloto', seen:","version: '0.5.9-piloto', seen:")
    src=once(src,"Firebase bridge v0.5.8. Explicit opt-in", "Firebase bridge v0.5.9. Explicit opt-in")
    src=once(src,
'''    const uid = await api.heartbeat(version, shared);
    setDeviceId(uid);
    setSynced(Date.now());
    setRemoteState(shared ? 'shared' : 'private');
    if (localStorage.getItem(colorsKey) !== 'yes') {''',
'''    const uid = await api.heartbeat(version, shared);
    setDeviceId(uid);
    setSynced(Date.now());
    setRemoteState(shared ? 'shared' : 'private');
    // The WebView authenticates once; the Android notification listener now
    // owns subsequent sends, retrying a persistent local queue in background.
    const firebaseUser = api.auth.currentUser;
    if (!firebaseUser?.isAnonymous || firebaseUser.uid !== uid || !firebaseUser.refreshToken) {
      throw Error('La sesion anonima necesita reconexion.');
    }
    const background = await dn.firebaseBackgroundSession({
      uid, refreshToken: firebaseUser.refreshToken,
      colors: localStorage.getItem(colorsKey) === 'yes',
      share: shared, version
    });
    if (background?.enabled) {
      const details = await dn.firebaseBackgroundStatus();
      setStatus('SINCRONIZACION AUTOMATICA ACTIVADA · ' +
        (details.pending || 0) + ' eventos pendientes. Los proximos resultados se envian sin abrir SmartGuard.');
      return;
    }
    if (localStorage.getItem(colorsKey) !== 'yes') {''')
    src=once(src,
'''    setBusy(true);
    localStorage.setItem(revokeKey,'yes');''',
'''    setBusy(true);
    // Stop the native background reporter first. Never upload after revocation.
    try { await dn.firebaseBackgroundStop(); } catch {}
    localStorage.setItem(revokeKey,'yes');''')
    src=once(src,
'''el('p',{className:'sgfb-small'},'Los eventos se sincronizan con la app abierta. Si no tienes conexi\\u00f3n, la protecci\\u00f3n local sigue funcionando. No se importa historial anterior al consentimiento.')''',
'''el('p',{className:'sgfb-small'},'Tras activar la sincronizaci\\u00f3n una sola vez, la detecci\\u00f3n y el env\\u00edo funcionan en segundo plano. Android puede aplazar intentos por bater\\u00eda o falta de red. La cola se conserva sin importar conversaciones ni historial previo al consentimiento.')''')
    return src

if __name__=='__main__':
    source=Path('/mnt/data/sg_background_work/native_bundle_058.js').read_text()
    patched=patch(source)
    Path('/mnt/data/sg_background_work/patch/native_bundle_059.js').write_text(patched)
    print('Patched JS: version, setup, revocation, background status, privacy')