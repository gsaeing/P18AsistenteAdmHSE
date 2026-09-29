/**
 * Configuración de Firebase para el programa.
 * Conectado con el proyecto generado gen-lang-client-0377970381.
 */

let runtimeConfig = null;
try {
  const res = await fetch("./firebase-applet-config.json");
  if (res.ok) {
    runtimeConfig = await res.json();
  }
} catch (_) {}

export const firebaseConfig = runtimeConfig || {
  projectId: "gen-lang-client-0377970381",
  appId: "1:560032998899:web:13a9c20ece5f888d4e9e86",
  apiKey: "AIzaSyCc3u4MThM5ni5_p1ZPhZE4Ft84yxYK2Q0",
  authDomain: "gen-lang-client-0377970381.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-p18asistenteadmh-5a0e3dd5-e9df-4dff-a688-70d82ea9da2d",
  storageBucket: "gen-lang-client-0377970381.firebasestorage.app",
  messagingSenderId: "560032998899",
  measurementId: "",
  oAuthClientId: "560032998899-p382r0i0e8ruiiv22vuac5lcumemvpqi.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

/** Correo del superadministrador principal */
export const SUPERADMIN_EMAIL = "gerencia@saeing.com";

/** Verifica si la configuración de Firebase está lista */
export const isFirebaseConfigured = () => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey !== "PEGA-AQUI-TU-API-KEY");
};
