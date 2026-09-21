/**
 * High-performance location provider that uses Capacitor native Geolocation on mobile devices
 * and falls back seamlessly to HTML5 Navigator Geolocation in standard web browsers.
 */
export async function getCurrentPosition() {
  try {
    if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
      let Geolocation = window.Capacitor?.Plugins?.Geolocation;
      if (!Geolocation) {
        const pkgName = '@capacitor/geolocation';
        const mod = await import(/* @vite-ignore */ pkgName);
        Geolocation = mod.Geolocation;
      }

      if (Geolocation) {
        const permissions = await Geolocation.checkPermissions();
        if (permissions.location !== 'granted') {
          const request = await Geolocation.requestPermissions();
          if (request.location !== 'granted' && request.location !== 'prompt') {
            throw new Error('Permesso di geolocalizzazione negato dall\'utente.');
          }
        }

        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 3600000
        });

        return {
          latitude: coordinates.coords.latitude,
          longitude: coordinates.coords.longitude,
          accuracy: coordinates.coords.accuracy
        };
      }
    }
  } catch (err) {
    console.warn('Capacitor native Geolocation fallback to HTML5 browser:', err?.message || err);
  }

  // HTML5 standard navigator fallback
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La geolocalizzazione non è supportata da questo browser o dispositivo.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
      },
      (error) => {
        let errorMsg = 'Impossibile rilevare la posizione.';
        if (error.code === error.PERMISSION_DENIED) errorMsg = 'Permesso di geolocalizzazione negato.';
        if (error.code === error.POSITION_UNAVAILABLE) errorMsg = 'Posizione geografica non disponibile.';
        if (error.code === error.TIMEOUT) errorMsg = 'Tempo scaduto per il rilevamento della posizione.';
        reject(new Error(errorMsg));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
