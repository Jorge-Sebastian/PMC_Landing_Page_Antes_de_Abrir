function commercialEndpoint(config) {
  const local = location.protocol === 'capacitor:' ||
    location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const url = new URL(config.commercialApiUrl || '/api/smartguard-commercial',
    local ? config.familyPublicOrigin : location.origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) {
    throw new Error('La URL comercial de SmartGuard no es válida.');
  }
  return url;
}

let callableSdk;
export async function callCommercial(config, app, user, operation, data) {
  if (!user) throw new Error('Inicia sesión en SmartGuard.');
  if (config.commercialTransport === 'firebase') {
    callableSdk ??= import('https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js');
    const {getFunctions, httpsCallable} = await callableSdk;
    return (await httpsCallable(getFunctions(app, 'us-central1'), operation)(data)).data;
  }

  const response = await fetch(commercialEndpoint(config), {
    method:'POST',
    headers:{Authorization:'Bearer ' + await user.getIdToken(), 'Content-Type':'application/json'},
    credentials:'omit',
    redirect:'error',
    signal:AbortSignal.timeout(20000),
    body:JSON.stringify({operation,data}),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result || !Object.hasOwn(result,'data')) {
    const error = new Error(result?.error?.message || 'El servicio comercial de SmartGuard no está disponible.');
    error.code = result?.error?.code ? 'functions/' + result.error.code : 'functions/unavailable';
    throw error;
  }
  return result.data;
}
