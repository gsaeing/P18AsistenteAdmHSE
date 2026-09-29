/**
 * Configuración de Firebase para el programa.
 * Explicación simple: aquí se pone la llave de su proyecto Firebase.
 * Si no hay llave, el programa funciona en modo prueba guardando en este computador.
 * Cómo conseguirla: console.firebase.google.com -> su proyecto -> Configuración -> Sus apps -> Web.
 */

// CAMBIE ESTOS DATOS por los de su proyecto Firebase. No los preste a nadie.
export const firebaseConfig = {
  apiKey: "PEGA-AQUI-TU-API-KEY",
  authDomain: "PEGA-AQUI-TU-PROYECTO.firebaseapp.com",
  projectId: "PEGA-AQUI-TU-PROYECTO",
  storageBucket: "PEGA-AQUI-TU-PROYECTO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:00000000000000000000"
};

/**
 * Correo del jefe total del sistema (superadministrador).
 * Explicación simple: esta persona puede ver y arreglar todo.
 */
export const SUPERADMIN_EMAIL = "gerencia@saeing.com";

/** Revisa si la llave de Firebase ya fue puesta o sigue de ejemplo. */
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey !== "PEGA-AQUI-TU-API-KEY";
};
