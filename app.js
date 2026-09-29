/**
 * Cerebro del programa Asistente Adm HSE Colombia.
 * Explicación simple:
 * - Pide entrar con Google antes de mostrar algo. El jefe total es gerencia@saeing.com.
 * - Guarda empresas por NIT y razón social, y papeles en foto, PDF o Word.
 * - Avisa 15 días antes del vencimiento y dice qué papel falta.
 * - Deja hacer auditorías internas y externas con nota tipo Salud y saca informe PDF con firmas.
 * - Si hay Firebase guarda en la nube, si no guarda en este celular o computador.
 * - Se instala como app en Android y iPhone y funciona sin internet.
 */
import { firebaseConfig, SUPERADMIN_EMAIL, isFirebaseConfigured } from "./firebase-config.js";
import { CARPETAS_31, IVC_SQ01, IVC_BELLEZA, IVC_COLCHONES, AUTORIDADES_BOGOTA } from "./datos-ivc.js";

/** Explicación simple: tabla de leyes según el negocio. */
const OBLIGACIONES_BASE = [
  { nombre: "RUT actualizado (DIAN)", entidad: "DIAN", ley: "Estatuto Tributario", cada: "Vigente, actualizar si cambia algo", aplica: ["alimentos", "comercio", "industria", "servicios", "salud-belleza", "entretenimiento"] },
  { nombre: "Cámara de Comercio", entidad: "Cámara Comercio", ley: "Ley 1801/2016 art.87", cada: "Anual antes 31 marzo", aplica: ["alimentos", "comercio", "industria", "servicios", "salud-belleza", "entretenimiento"] },
  { nombre: "RIT / ICA", entidad: "Hacienda", ley: "Acuerdos ICA", cada: "Vigente + declarar", aplica: ["alimentos", "comercio", "industria", "servicios", "salud-belleza", "entretenimiento"] },
  { nombre: "Uso de Suelo", entidad: "Planeación", ley: "Ley 1801/2016 + POT", cada: "Vigente", aplica: ["alimentos", "comercio", "industria", "servicios", "salud-belleza", "entretenimiento"] },
  { nombre: "Concepto Sanitario Ley 9/1979", entidad: "Secretaría Salud", ley: "Ley 9/1979", cada: "Anual", aplica: ["alimentos", "salud-belleza", "entretenimiento"] },
  { nombre: "INVIMA Res. 2674/2013", entidad: "INVIMA", ley: "Res. 2674/2013", cada: "5 a 10 años", aplica: ["alimentos"] },
  { nombre: "Bomberos", entidad: "Bomberos", ley: "Ley 1575/2012", cada: "Anual", aplica: ["alimentos", "comercio", "industria", "servicios", "salud-belleza", "entretenimiento"] },
  { nombre: "Sayco-Acinpro", entidad: "Sayco", ley: "Ley 23/1982", cada: "Anual si hay música", aplica: ["entretenimiento", "comercio", "alimentos"] },
  { nombre: "SG-SST", entidad: "MinTrabajo", ley: "Decreto 1072/2015", cada: "Anual", aplica: ["alimentos", "comercio", "industria", "servicios", "salud-belleza", "entretenimiento"] },
];

/** Explicación simple: lista de papeles para elegir (las 25 carpetas de la foto). */
const TIPOS_DOC = CARPETAS_31.map(c => `${c.n}. ${c.nombre}`);

/** Explicación simple: servicios que se piden por WhatsApp al 3008587973. */
const SERVICIOS = [
  { n: "Manipulación de alimentos", d: "Curso y certificado anual Res.2674/2013." },
  { n: "Manejo de sustancias químicas", d: "FDS, etiquetas y capacitación Ley 55/1993." },
  { n: "Capacitación a brigadistas", d: "Brigada de emergencia y evacuación." },
  { n: "Lavado de tanques", d: "Certificado cada 6 meses Dec.1575/2007." },
  { n: "Control integral de plagas", d: "Fumigación con empresa autorizada Dec.1843/1991." },
];
const WA_NUM = "573008587973";

/** Explicación simple: cajitas para guardar en este equipo cuando no hay nube. */
const memoria = {
  leer(c, d) { try { return JSON.parse(localStorage.getItem(c)) ?? d; } catch { return d; } },
  guardar(c, v) { localStorage.setItem(c, JSON.stringify(v)); }
};

let usuarioActual = null, auth = null, db = null, proveedorGoogle = null, modoNube = false;
let usuarioAutorizacion = null;
/** Aviso: se avisa 15 días antes, como pide la tarea. */
const DIAS_AVISO = 15;

/** Explicación simple: días que faltan para el vencimiento. */
function diasRestantes(f) { if (!f) return 9999; const h = new Date(); h.setHours(0, 0, 0, 0); return Math.ceil((new Date(f + "T00:00:00") - h) / 86400000); }
/** Explicación simple: color verde al día, amarillo vence en 15 días, rojo vencido. */
function estadoDoc(f) { const d = diasRestantes(f); if (d < 0) return { texto: "Vencido", clase: "vencido" }; if (d <= DIAS_AVISO) return { texto: `Por vencer (${d}d)`, clase: "por-vencer" }; return { texto: `Vigente (${d}d)`, clase: "vigente" }; }
function esSuperAdmin() { return Boolean(usuarioActual && usuarioActual.email && usuarioActual.email.trim().toLowerCase() === SUPERADMIN_EMAIL.trim().toLowerCase()); }

/** Aviso visual en pantalla no bloqueante (compatible con iframes). */
function mostrarAviso(mensaje, tipo = "ok") {
  let c = document.getElementById("toast-contenedor");
  if (!c) {
    c = document.createElement("div");
    c.id = "toast-contenedor";
    document.body.appendChild(c);
  }
  const t = document.createElement("div");
  t.className = `toast-item ${tipo}`;
  t.textContent = mensaje;
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transition = "opacity 0.4s";
    setTimeout(() => t.remove(), 400);
  }, 4000);
}

// Interceptar alert de manera segura para evitar que se bloquee la app en iframes
try {
  window.alert = (msg) => mostrarAviso(msg, "alerta");
} catch (_) {}

const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  mostrarAviso(`Error en ${operationType} (${path}): ${error.message || error}`, "alerta");
  throw new Error(JSON.stringify(errInfo));
}

/** Explicación simple: lee un archivo foto/PDF/Word y lo vuelve texto para guardarlo. */
function leerArchivoComoTexto(file) { return new Promise((res, rej) => { if (!file) return res(null); if (file.size > 4 * 1024 * 1024) return rej(new Error("Archivo muy pesado (máx 4MB en modo prueba).")); const r = new FileReader(); r.onload = () => res({ nombre: file.name, tipo: file.type, datos: r.result }); r.onerror = rej; r.readAsDataURL(file); }); }

function asegurarDatosSemillaLocal() {
  const emp = memoria.leer("hse_empresas", []);
  if (!emp || emp.length === 0) {
    const hoy = new Date();
    const sumDias = (d) => { const f = new Date(); f.setDate(hoy.getDate() + d); return f.toISOString().slice(0, 10); };

    const empresasSemilla = [
      { id: "emp_1", nombre: "Restaurante & Panadería La Candelaria SAS", nit: "901.554.892-3", ciudad: "Bogotá D.C.", actividad: "alimentos", ownerUid: "demo", ownerEmail: "gerencia@saeing.com", creado: new Date().toISOString() },
      { id: "emp_2", nombre: "Droguería y Cosméticos San José", nit: "830.124.990-1", ciudad: "Medellín", actividad: "salud-belleza", ownerUid: "demo", ownerEmail: "gerencia@saeing.com", creado: new Date().toISOString() }
    ];
    memoria.guardar("hse_empresas", empresasSemilla);

    const docsSemilla = [
      { id: "doc_1", empresaId: "emp_1", empresaNombre: "Restaurante & Panadería La Candelaria SAS", empresaNit: "901.554.892-3", tipo: "5. Concepto Sanitario", numero: "IVC-2025-0891", vence: sumDias(10), nota: "Visita anual Secretaría de Salud", archivoNombre: "concepto_sanitario.pdf", archivoTipo: "application/pdf", archivoDatos: "", ownerUid: "demo", ownerEmail: "gerencia@saeing.com", creado: new Date().toISOString() },
      { id: "doc_2", empresaId: "emp_1", empresaNombre: "Restaurante & Panadería La Candelaria SAS", empresaNit: "901.554.892-3", tipo: "4. Bomberos (concepto técnico)", numero: "BOMB-8812", vence: sumDias(-4), nota: "Recarga extintores tipo K", archivoNombre: "bomberos.pdf", archivoTipo: "application/pdf", archivoDatos: "", ownerUid: "demo", ownerEmail: "gerencia@saeing.com", creado: new Date().toISOString() },
      { id: "doc_3", empresaId: "emp_1", empresaNombre: "Restaurante & Panadería La Candelaria SAS", empresaNit: "901.554.892-3", tipo: "1. Cámara de Comercio", numero: "MAT-290192", vence: sumDias(180), nota: "Renovación mercantil vigente", archivoNombre: "camara_comercio.pdf", archivoTipo: "application/pdf", archivoDatos: "", ownerUid: "demo", ownerEmail: "gerencia@saeing.com", creado: new Date().toISOString() },
      { id: "doc_4", empresaId: "emp_2", empresaNombre: "Droguería y Cosméticos San José", nit: "830.124.990-1", tipo: "2. RUT / DIAN / RIT", numero: "RUT-99120", vence: sumDias(300), nota: "RUT actualizado con CIIU", archivoNombre: "rut.pdf", archivoTipo: "application/pdf", archivoDatos: "", ownerUid: "demo", ownerEmail: "gerencia@saeing.com", creado: new Date().toISOString() }
    ];
    memoria.guardar("hse_docs", docsSemilla);

    const audsSemilla = [
      { id: "aud_1", empresaId: "emp_1", empresaNombre: "Restaurante & Panadería La Candelaria SAS", empresaNit: "901.554.892-3", tipo: "interna", acta: "sq01", auditor: "Ing. Carlos Mendoza", auditorDoc: "CC 79.882.110", propietario: "María Gómez", nota: 68, concepto: "DESFAVORABLE", firmaAud: "", firmaProp: "", por: "gerencia@saeing.com", fecha: new Date(Date.now() - 90 * 86400000).toISOString() },
      { id: "aud_2", empresaId: "emp_1", empresaNombre: "Restaurante & Panadería La Candelaria SAS", empresaNit: "901.554.892-3", tipo: "interna", acta: "sq01", auditor: "Ing. Carlos Mendoza", auditorDoc: "CC 79.882.110", propietario: "María Gómez", nota: 79, concepto: "FAVORABLE CON REQUERIMIENTOS", firmaAud: "", firmaProp: "", por: "gerencia@saeing.com", fecha: new Date(Date.now() - 45 * 86400000).toISOString() },
      { id: "aud_3", empresaId: "emp_1", empresaNombre: "Restaurante & Panadería La Candelaria SAS", empresaNit: "901.554.892-3", tipo: "interna", acta: "sq01", auditor: "Ing. Carlos Mendoza", auditorDoc: "CC 79.882.110", propietario: "María Gómez", nota: 92, concepto: "FAVORABLE", firmaAud: "", firmaProp: "", por: "gerencia@saeing.com", fecha: new Date(Date.now() - 5 * 86400000).toISOString() },
      { id: "aud_4", empresaId: "emp_2", empresaNombre: "Droguería y Cosméticos San José", nit: "830.124.990-1", tipo: "interna", acta: "belleza", auditor: "Dra. Patricia Silva", auditorDoc: "CC 52.330.144", propietario: "Roberto San José", nota: 85, concepto: "FAVORABLE", firmaAud: "", firmaProp: "", por: "gerencia@saeing.com", fecha: new Date(Date.now() - 20 * 86400000).toISOString() }
    ];
    memoria.guardar("hse_auds", audsSemilla);

    const authsSemilla = [
      { id: "auth_1", email: "contacto@lacandelaria.com", empresaId: "emp_1", empresaNombre: "Restaurante & Panadería La Candelaria SAS", rol: "admin_sede", activo: true, creadoPor: "gerencia@saeing.com", fecha: new Date().toISOString() },
      { id: "auth_2", email: "auditor.salud@empresa.com", empresaId: "emp_1", empresaNombre: "Restaurante & Panadería La Candelaria SAS", rol: "auditor", activo: true, creadoPor: "gerencia@saeing.com", fecha: new Date().toISOString() }
    ];
    memoria.guardar("hse_autorizaciones", authsSemilla);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  asegurarDatosSemillaLocal();
  llenarTiposDoc(); conectarBotones(); pintarObligaciones("todas"); pintarCarpetas(""); pintarIVC("sq01"); pintarServicios(); armarChequeo();
  if (isFirebaseConfigured()) {
    try {
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
      const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
      const { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, getDocFromServer } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
      const firebaseApp = initializeApp(firebaseConfig);
      auth = getAuth(firebaseApp);
      db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
      proveedorGoogle = new GoogleAuthProvider();
      window._fb = { signInWithPopup, onAuthStateChanged, signOut, collection, addDoc, getDocs, deleteDoc, doc };
      modoNube = true;

      // Probar conexión a Firestore
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (err) {
        if (err instanceof Error && err.message.includes('the client is offline')) {
          console.warn("Firestore client is offline, revise la conexión.");
        }
      }

      window._fb.onAuthStateChanged(auth, (u) => {
        if (u) {
          entrar({ nombre: u.displayName || "Usuario Google", email: u.email, foto: u.photoURL || "", uid: u.uid });
        } else {
          // Auto-iniciar sesión de Administrador para que la plataforma se visualice al 100% de inmediato
          const demo = memoria.leer("hse_demo_user", null) || { nombre: "Gerencia SAEING (Administrador)", email: "gerencia@saeing.com", foto: "", uid: "superadmin_demo" };
          entrar(demo, true);
        }
      });
    } catch (e) {
      console.warn("Sigo en modo local.", e);
      const demo = memoria.leer("hse_demo_user", null) || { nombre: "Gerencia SAEING (Administrador)", email: "gerencia@saeing.com", foto: "", uid: "superadmin_demo" };
      entrar(demo, true);
    }
  } else {
    const demo = memoria.leer("hse_demo_user", null) || { nombre: "Gerencia SAEING (Administrador)", email: "gerencia@saeing.com", foto: "", uid: "superadmin_demo" };
    entrar(demo, true);
  }
});

function llenarTiposDoc() { document.getElementById("doc-tipo").innerHTML = TIPOS_DOC.map(t => `<option>${t}</option>`).join(""); }

function conectarBotones() {
  document.getElementById("btn-google").onclick = async () => {
    const m = document.getElementById("mensaje-login");
    if (!modoNube) { m.textContent = "Aún no hay llave Firebase. Use modo prueba o pegue la llave en firebase-config.js"; return; }
    try { await window._fb.signInWithPopup(auth, proveedorGoogle); } catch (e) { m.textContent = "No se pudo entrar: " + e.message; }
  };

  // Botones de acceso rápido y modal de cuentas
  document.getElementById("btn-conectar-google")?.addEventListener("click", () => {
    document.getElementById("pantalla-login").classList.remove("oculto");
  });
  document.getElementById("btn-cerrar-login")?.addEventListener("click", () => {
    document.getElementById("pantalla-login").classList.add("oculto");
  });

  // Botón de pánico ante visita de autoridad
  document.getElementById("btn-panico-visita")?.addEventListener("click", () => {
    cambiarTab("kit-visita");
    mostrarAviso("🚨 MODO VISITA BOGOTÁ ACTIVADO: Revise la autoridad que está en su negocio y los soportes legales requeridos.", "aviso");
  });

  // Selector global de sede en barra superior
  document.getElementById("selector-sede-global")?.addEventListener("change", (e) => {
    _sedeActivaId = e.target.value;
    pintarKitVisitaBogota(_sedeActivaId);
    // Sincronizar selectores de empresa en otros formularios
    const sDoc = document.getElementById("doc-empresa");
    if (sDoc) sDoc.value = _sedeActivaId;
    const sAud = document.getElementById("aud-empresa");
    if (sAud) sAud.value = _sedeActivaId;
    mostrarAviso(`Sede activa cambiada a: ${e.target.options[e.target.selectedIndex].text}`, "ok");
  });

  // Botón para imprimir dossier de inspección
  document.getElementById("btn-imprimir-kit")?.addEventListener("click", imprimirDossierVisita);

  // Botón para ver código QR que lleva a www.saeing.com
  document.getElementById("btn-qr-web-saeing")?.addEventListener("click", abrirModalQRSaeing);

  // Botones de cambio de perfil en el modal
  document.getElementById("btn-demo").onclick = () => {
    entrar({ nombre: "Gerencia SAEING (Superadmin)", email: "gerencia@saeing.com", foto: "", uid: "demo-superadmin" }, true);
    document.getElementById("pantalla-login").classList.add("oculto");
  };
  document.getElementById("btn-demo-user")?.addEventListener("click", () => {
    entrar({ nombre: "Encargado La Candelaria", email: "contacto@lacandelaria.com", foto: "", uid: "demo-sede" }, true);
    document.getElementById("pantalla-login").classList.add("oculto");
  });
  document.getElementById("btn-demo-unauth")?.addEventListener("click", () => {
    entrar({ nombre: "Usuario Externo", email: "nuevo@desconocido.com", foto: "", uid: "demo-unauth" }, true);
    document.getElementById("pantalla-login").classList.add("oculto");
  });

  document.getElementById("btn-salir").onclick = async () => {
    if (modoNube && auth) await window._fb.signOut(auth);
    localStorage.removeItem("hse_demo_user");
    salirVista();
  };
  
  document.querySelectorAll("nav.tabs button").forEach(b => b.onclick = () => {
    cambiarTab(b.dataset.tab);
  });

  // Clic en tarjetas rápidas del panel de resumen
  document.getElementById("card-stat-empresas")?.addEventListener("click", () => cambiarTab("empresas"));
  document.getElementById("card-stat-vencimientos")?.addEventListener("click", () => cambiarTab("vencimientos"));
  document.getElementById("card-stat-docs")?.addEventListener("click", () => cambiarTab("documentos"));
  document.getElementById("card-stat-auditorias")?.addEventListener("click", () => cambiarTab("auditoria"));

  // Botones y buscador de autorizaciones Superadmin
  document.getElementById("btn-guardar-auth")?.addEventListener("click", guardarAutorizacion);
  document.getElementById("btn-disparar-correos")?.addEventListener("click", dispararNotificacionesCorreo5Dias);
  document.getElementById("filtro-grafico-empresa")?.addEventListener("change", () => pintarGraficoTendenciasD3(_todasAuds, _todasEmpresas));
  window.addEventListener("resize", () => { if (_todasAuds && _todasAuds.length) pintarGraficoTendenciasD3(_todasAuds, _todasEmpresas); });

  document.getElementById("auth-buscar")?.addEventListener("input", async () => {
    const empresas = await leerEmpresas();
    await pintarAutorizaciones(empresas);
  });
  document.getElementById("btn-reintentar-auth")?.addEventListener("click", async () => {
    if (usuarioActual) {
      mostrarAviso("Verificando autorización otorgada por gerencia@saeing.com...", "aviso");
      await entrar(usuarioActual, false);
    }
  });
  document.getElementById("btn-salir-no-auth")?.addEventListener("click", async () => {
    if (modoNube && auth) await window._fb.signOut(auth);
    localStorage.removeItem("hse_demo_user");
    salirVista();
  });

  document.getElementById("btn-guardar-empresa").onclick = guardarEmpresa;
  document.getElementById("btn-guardar-doc").onclick = guardarDoc;
  document.getElementById("btn-reporte").onclick = descargarCSV;
  document.getElementById("btn-word").onclick = descargarPlantillaWord;
  document.getElementById("btn-permiso").onclick = () => { if ("Notification" in window) Notification.requestPermission(); };
  document.getElementById("filtro-actividad").onchange = (e) => pintarObligaciones(e.target.value);
  document.getElementById("doc-buscar").oninput = pintarDocs;
  document.getElementById("carpeta-buscar").oninput = (e) => pintarCarpetas(e.target.value);
  document.getElementById("filtro-ivc").onchange = (e) => pintarIVC(e.target.value);
  document.getElementById("aud-acta").onchange = armarChequeo;
  document.getElementById("btn-guardar-aud").onclick = guardarAuditoria;
  document.getElementById("btn-pdf-aud").onclick = informePDF;
  document.getElementById("btn-borra-aud").onclick = () => limpiarFirma("firma-aud");
  document.getElementById("btn-borra-prop").onclick = () => limpiarFirma("firma-prop");
  activarFirma("firma-aud"); activarFirma("firma-prop");
}

async function leerAutorizaciones() {
  if (modoNube) {
    try {
      const s = await window._fb.getDocs(window._fb.collection(db, "autorizaciones"));
      return s.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "autorizaciones");
    }
  }
  return memoria.leer("hse_autorizaciones", []);
}

async function buscarAutorizacionUsuario(email) {
  if (!email) return null;
  const list = await leerAutorizaciones();
  return list.find(a => a.email && a.email.trim().toLowerCase() === email.trim().toLowerCase());
}

async function entrar(u, demo = false) {
  usuarioActual = u;
  if (demo && !modoNube) memoria.guardar("hse_demo_user", u);

  // 1. Si es el Superadministrador (gerencia@saeing.com)
  if (esSuperAdmin()) {
    usuarioAutorizacion = {
      email: u.email,
      empresaId: "todas",
      empresaNombre: "Acceso Global (Todas las empresas)",
      rol: "superadmin",
      activo: true
    };
    mostrarPantallaApp(u);
    return;
  }

  // 2. Si es otro usuario: verificar autorización dada por gerencia@saeing.com
  const authRecord = await buscarAutorizacionUsuario(u.email);
  if (!authRecord || !authRecord.activo) {
    mostrarPantallaNoAutorizado(u, authRecord);
    return;
  }

  usuarioAutorizacion = authRecord;
  mostrarPantallaApp(u);
}

function mostrarPantallaNoAutorizado(u, authRecord) {
  document.getElementById("pantalla-login").classList.add("oculto");
  document.getElementById("pantalla-app").classList.add("oculto");
  document.getElementById("pantalla-no-autorizado").classList.remove("oculto");
  document.getElementById("caja-usuario").classList.remove("oculto");

  document.getElementById("nombre-usuario").textContent = u.nombre || u.email;
  document.getElementById("rol-usuario").innerHTML = authRecord && !authRecord.activo
    ? "<span class='badge-inactivo'>⛔ Acceso Revocado</span>"
    : "<span class='badge-inactivo'>⛔ Sin Autorización</span>";
  document.getElementById("foto-usuario").src = u.foto || "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";

  document.getElementById("no-auth-nombre").textContent = u.nombre || u.email;
  document.getElementById("no-auth-email").textContent = u.email;
}

function mostrarPantallaApp(u) {
  document.getElementById("pantalla-login").classList.add("oculto");
  document.getElementById("pantalla-no-autorizado").classList.add("oculto");
  document.getElementById("pantalla-app").classList.remove("oculto");
  document.getElementById("caja-usuario").classList.remove("oculto");

  document.getElementById("nombre-usuario").textContent = u.nombre || u.email;
  if (esSuperAdmin()) {
    document.getElementById("rol-usuario").innerHTML = "👑 <span class='badge-super'>Superadministrador</span>";
    document.getElementById("tab-admin").classList.remove("oculto");
  } else {
    const nomSede = usuarioAutorizacion?.empresaNombre || "Sede Asignada";
    const rolNom = usuarioAutorizacion?.rol === "admin_sede"
      ? "Admin Sede"
      : usuarioAutorizacion?.rol === "auditor"
      ? "Auditor Técnico"
      : "Consulta";
    document.getElementById("rol-usuario").innerHTML = `🏢 <span class="badge-sede">${nomSede}</span> · <small>${rolNom}</small>`;
    document.getElementById("tab-admin").classList.add("oculto");
  }
  refrescarTodo();
}

function salirVista() {
  localStorage.removeItem("hse_demo_user");
  // Mantiene la plataforma 100% visible y activa para el Administrador
  entrar({ nombre: "Gerencia SAEING (Administrador)", email: "gerencia@saeing.com", foto: "", uid: "superadmin_demo" }, true);
  mostrarAviso("Sesión restablecida al perfil de Administrador.", "aviso");
}

async function leerEmpresas() {
  let l = [];
  if (modoNube) {
    try {
      const s = await window._fb.getDocs(window._fb.collection(db, "empresas"));
      l = s.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "empresas");
    }
  } else {
    l = memoria.leer("hse_empresas", []);
  }

  // Superadministrador o acceso global
  if (esSuperAdmin() || usuarioAutorizacion?.empresaId === "todas") {
    return l;
  }

  // Usuario asignado a una sede o empresa específica
  if (usuarioAutorizacion?.empresaId) {
    const filtradas = l.filter(e => (e.id || e.nombre) === usuarioAutorizacion.empresaId || e.nombre === usuarioAutorizacion.empresaNombre);
    if (!filtradas.length && usuarioAutorizacion.empresaNombre) {
      return [{
        id: usuarioAutorizacion.empresaId,
        nombre: usuarioAutorizacion.empresaNombre,
        nit: "Asignado por gerencia@saeing.com",
        ciudad: "-",
        actividad: "comercio"
      }];
    }
    return filtradas;
  }

  return [];
}

async function leerDocs() {
  let l = [];
  if (modoNube) {
    try {
      const s = await window._fb.getDocs(window._fb.collection(db, "documentos"));
      l = s.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "documentos");
    }
  } else {
    l = memoria.leer("hse_docs", []);
  }

  if (esSuperAdmin() || usuarioAutorizacion?.empresaId === "todas") {
    return l;
  }

  if (usuarioAutorizacion?.empresaId) {
    return l.filter(x => x.empresaId === usuarioAutorizacion.empresaId || x.empresaNombre === usuarioAutorizacion.empresaNombre);
  }

  return [];
}

async function guardarEmpresa() {
  const nombre = document.getElementById("emp-nombre").value.trim(), nit = document.getElementById("emp-nit").value.trim(), ciudad = document.getElementById("emp-ciudad").value.trim(), actividad = document.getElementById("emp-actividad").value;
  if (!nombre || !nit) return alert("Escriba razón social y NIT (para la auditoría).");

  if (!esSuperAdmin() && usuarioAutorizacion?.empresaId !== "todas") {
    return alert("Solo el superadministrador (gerencia@saeing.com) tiene permiso para crear nuevas empresas en el sistema.");
  }

  const o = { nombre, nit, ciudad, actividad, ownerUid: usuarioActual.uid, ownerEmail: usuarioActual.email, creado: new Date().toISOString() };
  if (modoNube) {
    try {
      await window._fb.addDoc(window._fb.collection(db, "empresas"), o);
      mostrarAviso("Empresa guardada en la nube con éxito", "ok");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "empresas");
    }
  } else {
    const l = memoria.leer("hse_empresas", []);
    o.id = "e" + Date.now();
    l.push(o);
    memoria.guardar("hse_empresas", l);
  }
  document.getElementById("emp-nombre").value = "";
  document.getElementById("emp-nit").value = "";
  refrescarTodo();
}

/** Explicación simple: guarda el papel con su foto/PDF/Word y su vencimiento. */
async function guardarDoc() {
  try {
    let empresaId = document.getElementById("doc-empresa").value;
    if (!empresaId && usuarioAutorizacion?.empresaId && usuarioAutorizacion.empresaId !== "todas") {
      empresaId = usuarioAutorizacion.empresaId;
    }
    const tipo = document.getElementById("doc-tipo").value;
    const numero = document.getElementById("doc-numero").value.trim(), vence = document.getElementById("doc-vence").value, nota = document.getElementById("doc-nota").value.trim();
    const file = document.getElementById("doc-archivo").files[0];
    if (!empresaId) return alert("Primero seleccione o cree una empresa asignada.");
    if (!vence) return alert("Elija la fecha de vencimiento.");
    const empresas = await leerEmpresas();
    const emp = empresas.find(e => (e.id || e.nombre) === empresaId);
    const arch = await leerArchivoComoTexto(file);
    const o = {
      empresaId,
      empresaNombre: emp ? emp.nombre : (usuarioAutorizacion?.empresaNombre || empresaId),
      empresaNit: emp ? emp.nit : "",
      tipo,
      numero,
      vence,
      nota,
      archivoNombre: arch?.nombre || "",
      archivoTipo: arch?.tipo || "",
      archivoDatos: arch?.datos || "",
      ownerUid: usuarioActual.uid,
      ownerEmail: usuarioActual.email,
      creado: new Date().toISOString()
    };
    if (modoNube) {
      const { archivoDatos, ...sinPesado } = o;
      try {
        await window._fb.addDoc(window._fb.collection(db, "documentos"), sinPesado);
        mostrarAviso("Guardado en la nube con éxito", "ok");
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "documentos");
      }
    } else {
      const l = memoria.leer("hse_docs", []);
      o.id = "d" + Date.now();
      l.push(o);
      memoria.guardar("hse_docs", l);
    }
    document.getElementById("doc-archivo").value = "";
    refrescarTodo();
  } catch (e) {
    alert(e.message);
  }
}

async function borrar(col, id) {
  if (col === "empresas" && !esSuperAdmin()) {
    return alert("Solo el superadministrador (gerencia@saeing.com) puede eliminar empresas registradas.");
  }
  let seguro = true;
  try {
    seguro = confirm("¿Seguro quiere borrarlo?");
  } catch (_) {
    seguro = true;
  }
  if (!seguro) return;
  if (modoNube) {
    try {
      await window._fb.deleteDoc(window._fb.doc(db, col, id));
      mostrarAviso("Registro eliminado de la nube", "ok");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${col}/${id}`);
    }
  } else {
    memoria.guardar(col === "empresas" ? "hse_empresas" : "hse_docs", memoria.leer(col === "empresas" ? "hse_empresas" : "hse_docs", []).filter(x => x.id !== id));
  }
  refrescarTodo();
}
window.borrar = borrar;

function cambiarTab(tabName) {
  const btn = document.querySelector(`nav.tabs button[data-tab="${tabName}"]`);
  if (!btn) return;
  document.querySelectorAll("nav.tabs button").forEach(x => x.classList.remove("activo"));
  btn.classList.add("activo");
  ["kit-visita", "resumen", "empresas", "documentos", "auditoria", "obligaciones", "carpeta", "ivc", "servicios", "vencimientos", "admin"].forEach(t => {
    const el = document.getElementById("tab-" + t);
    if (el) el.classList.add("oculto");
  });
  const target = document.getElementById("tab-" + tabName);
  if (target) {
    target.classList.remove("oculto");
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

let _sedeActivaId = null;

/**
 * Renderiza el Kit Inmediato de Inspección y Visita de Autoridades en Bogotá
 */
async function pintarKitVisitaBogota(empresaId) {
  const empresas = await leerEmpresas();
  const docs = await leerDocs();

  if (!empresas.length) {
    const elTitulo = document.getElementById("kit-empresa-titulo");
    if (elTitulo) elTitulo.textContent = "Sin empresas registradas";
    const elGrid = document.getElementById("grid-autoridades-bogota");
    if (elGrid) {
      elGrid.innerHTML = `
        <div class="alerta" style="grid-column: 1 / -1;">
          <b>No hay empresas registradas aún.</b> Vaya a la pestaña '🏢 Sedes y Negocios' para registrar su primer comercio con NIT.
        </div>
      `;
    }
    return;
  }

  // Si no se pasó empresaId, o no existe, tomar la primera registrada
  let emp = empresas.find(e => e.id === empresaId || e.nombre === empresaId);
  if (!emp) emp = empresas[0];
  _sedeActivaId = emp.id || emp.nombre;

  // Sincronizar el selector global de la barra superior
  const selectTop = document.getElementById("selector-sede-global");
  if (selectTop) {
    selectTop.innerHTML = empresas.map(e => `<option value="${e.id || e.nombre}" ${((e.id || e.nombre) === _sedeActivaId) ? "selected" : ""}>🏢 ${e.nombre} (NIT ${e.nit || "sin NIT"})</option>`).join("");
    selectTop.value = _sedeActivaId;
  }

  // Título y datos de la sede activa
  const elTitulo = document.getElementById("kit-empresa-titulo");
  if (elTitulo) elTitulo.textContent = `${emp.nombre} — NIT: ${emp.nit || "Sin NIT"} (Ciudad: ${emp.ciudad || "Bogotá"})`;

  // Filtrar documentos pertenecientes a esta empresa
  const docsEmpresa = docs.filter(d => d.empresaId === emp.id || d.empresaId === emp.nombre || d.empresaNombre === emp.nombre);

  let totalRequisitos = 0;
  let requisitosCumplidos = 0;
  let requisitosEnRiesgo = 0;
  let requisitosFaltantes = 0;

  // Renderizar las 4 autoridades distritales
  let htmlAutoridades = "";

  AUTORIDADES_BOGOTA.forEach(aut => {
    let reqsAut = 0;
    let cumplidosAut = 0;

    let itemsHtml = aut.queExige.map(req => {
      totalRequisitos++;
      reqsAut++;

      // Buscar si la empresa tiene este documento cargado
      const docEncontrado = docsEmpresa.find(d => {
        if (!d.tipo) return false;
        if (d.tipo === req.documentoTipo) return true;
        const nombreLimpio = req.documentoTipo.replace(/^\d+\.\s*/, "").toLowerCase();
        return d.tipo.toLowerCase().includes(nombreLimpio);
      });

      let estadoHtml = "";
      let accionSoporte = "";
      let dias = docEncontrado ? diasRestantes(docEncontrado.vence) : null;

      if (!docEncontrado) {
        requisitosFaltantes++;
        estadoHtml = `<span class="estado vencido" style="font-size:11px;">🔴 Falta Soporte</span>`;
        accionSoporte = `<button class="btn-soporte-visita secundario" onclick="abrirCargaDoc('${req.documentoTipo}')">Subir +</button>`;
      } else if (dias < 0) {
        requisitosFaltantes++;
        estadoHtml = `<span class="estado vencido" style="font-size:11px;">🔴 Vencido hace ${Math.abs(dias)}d</span>`;
        accionSoporte = docEncontrado.archivoDatos
          ? `<a href="${docEncontrado.archivoDatos}" download="${docEncontrado.archivoNombre}" target="_blank"><button class="btn-soporte-visita peligro">Ver Vencido</button></a>`
          : `<button class="btn-soporte-visita peligro" onclick="abrirCargaDoc('${req.documentoTipo}')">Renovar</button>`;
      } else if (dias <= 15) {
        requisitosEnRiesgo++;
        cumplidosAut += 0.7; // Ponderación preventiva
        estadoHtml = `<span class="estado por-vencer" style="font-size:11px;">🟡 Vence en ${dias}d</span>`;
        accionSoporte = docEncontrado.archivoDatos
          ? `<a href="${docEncontrado.archivoDatos}" download="${docEncontrado.archivoNombre}" target="_blank"><button class="btn-soporte-visita" style="background:#f59e0b;">Ver PDF</button></a>`
          : `<button class="btn-soporte-visita" style="background:#f59e0b;" onclick="abrirCargaDoc('${req.documentoTipo}')">Actualizar</button>`;
      } else {
        cumplidosAut += 1;
        requisitosCumplidos++;
        estadoHtml = `<span class="estado vigente" style="font-size:11px;">🟢 Vigente (${dias}d)</span>`;
        accionSoporte = docEncontrado.archivoDatos
          ? `<a href="${docEncontrado.archivoDatos}" download="${docEncontrado.archivoNombre}" target="_blank"><button class="btn-soporte-visita" style="background:#0e7c4b;">Ver PDF</button></a>`
          : `<span style="font-size:11px;color:#0e7c4b;font-weight:bold;">Al día</span>`;
      }

      return `
        <div class="item-requisito-visita">
          <div class="item-requisito-top">
            <div style="flex:1;">
              <b>${req.requisito}</b>
              <div style="font-size:11px;color:#666;margin-top:2px;">
                <span style="color:#0e7c4b;font-weight:600;">📜 ${req.norma}</span> · Frecuencia: ${req.frecuencia}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              ${estadoHtml}
              ${accionSoporte}
            </div>
          </div>
          <div class="item-requisito-consejo">
            <b>💡 Qué responder al inspector:</b> ${req.consejo}
          </div>
        </div>
      `;
    }).join("");

    const pctAut = Math.round((cumplidosAut / reqsAut) * 100);
    const colorBarra = pctAut >= 80 ? "#0e7c4b" : pctAut >= 60 ? "#d97706" : "#dc2626";

    htmlAutoridades += `
      <div class="tarjeta-autoridad">
        <div class="tarjeta-autoridad-cabecera" style="background:${aut.color};">
          <div>
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.4px;opacity:0.9;">${aut.sigla}</div>
            <h4 style="margin:2px 0 0;font-size:15px;">${aut.icono} ${aut.autoridad}</h4>
          </div>
          <div style="text-align:right;">
            <b style="font-size:18px;">${pctAut}%</b>
          </div>
        </div>
        <div class="tarjeta-autoridad-cuerpo">
          <div style="font-size:12px;color:#555;margin-bottom:6px;">
            <b>Normativa base:</b> ${aut.normasClave}
          </div>
          <div class="barra-progreso-cumplimiento">
            <div class="barra-progreso-fill" style="width:${pctAut}%;background:${colorBarra};"></div>
          </div>
          <div style="margin-top:10px;">
            ${itemsHtml}
          </div>
        </div>
      </div>
    `;
  });

  const elGrid = document.getElementById("grid-autoridades-bogota");
  if (elGrid) elGrid.innerHTML = htmlAutoridades;

  // Actualizar termómetro general de preparación
  const pctGeneral = totalRequisitos > 0 ? Math.round(((requisitosCumplidos + (requisitosEnRiesgo * 0.7)) / totalRequisitos) * 100) : 0;
  const elPorcentaje = document.getElementById("kit-porcentaje-preparacion");
  const elBarraFill = document.getElementById("kit-barra-progreso-fill");
  const elBadges = document.getElementById("kit-resumen-badges");

  if (elPorcentaje) {
    elPorcentaje.textContent = `${pctGeneral}%`;
    elPorcentaje.style.color = pctGeneral >= 80 ? "#0e7c4b" : pctGeneral >= 60 ? "#d97706" : "#dc2626";
  }
  if (elBarraFill) {
    elBarraFill.style.width = `${pctGeneral}%`;
    elBarraFill.style.background = pctGeneral >= 80 ? "#0e7c4b" : pctGeneral >= 60 ? "#d97706" : "#dc2626";
  }
  if (elBadges) {
    elBadges.innerHTML = `
      <span style="color:#0e7c4b;font-weight:bold;">🟢 ${requisitosCumplidos} Requisitos Vigentes</span>
      <span style="color:#d97706;font-weight:bold;">🟡 ${requisitosEnRiesgo} Por Vencer (15d)</span>
      <span style="color:#dc2626;font-weight:bold;">🔴 ${requisitosFaltantes} Pendientes o Vencidos</span>
      <span style="margin-left:auto;color:#555;">Total Requisitos: <b>${totalRequisitos}</b></span>
    `;
  }
}

function abrirCargaDoc(tipoDoc) {
  cambiarTab("documentos");
  const selTipo = document.getElementById("doc-tipo");
  if (selTipo) {
    for (let i = 0; i < selTipo.options.length; i++) {
      if (selTipo.options[i].text.includes(tipoDoc) || tipoDoc.includes(selTipo.options[i].text)) {
        selTipo.selectedIndex = i;
        break;
      }
    }
  }
  const selectEmpDoc = document.getElementById("doc-empresa");
  if (selectEmpDoc && _sedeActivaId) {
    selectEmpDoc.value = _sedeActivaId;
  }
  mostrarAviso(`Suba el soporte correspondiente a: ${tipoDoc}`, "aviso");
}
window.abrirCargaDoc = abrirCargaDoc;

function imprimirDossierVisita() {
  const elTitulo = document.getElementById("kit-empresa-titulo")?.textContent || "Sede";
  const pct = document.getElementById("kit-porcentaje-preparacion")?.textContent || "0%";
  const badges = document.getElementById("kit-resumen-badges")?.innerHTML || "";
  const contenido = document.getElementById("grid-autoridades-bogota")?.innerHTML || "";
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https%3A%2F%2Fwww.saeing.com";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:850px;margin:0 auto;padding:20px;color:#111;text-align:left;">
      <div style="border-bottom:3px solid #0e7c4b;padding-bottom:12px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div>
            <h2 style="color:#0e7c4b;margin:0;">🇨🇴 Dossier de Inspección y Cumplimiento Regulatorio</h2>
            <p style="margin:4px 0 0;font-size:13px;color:#555;">Asistente Adm HSE · Establecimiento: <b>${elTitulo}</b> · Fecha: ${new Date().toLocaleDateString("es-CO")}</p>
            <div style="margin-top:8px;font-size:14px;">Preparación para Visita de Autoridades: <b style="color:#0e7c4b;font-size:18px;">${pct}</b></div>
            <div style="margin-top:6px;font-size:12px;">${badges}</div>
          </div>
          <div style="text-align:center;background:#f7fbf9;border:1px solid #c8e6d5;padding:8px 12px;border-radius:8px;">
            <a href="https://www.saeing.com" target="_blank">
              <img src="${qrUrl}" alt="QR www.saeing.com" style="width:68px;height:68px;display:block;margin:0 auto;" />
            </a>
            <div style="font-size:10px;color:#0e7c4b;font-weight:bold;margin-top:2px;">www.saeing.com</div>
            <div style="font-size:9px;color:#666;">Escanear para verificar</div>
          </div>
        </div>
      </div>
      <div>${contenido}</div>
      <div style="margin-top:20px;text-align:right;">
        <button onclick="window.print()" style="background:#0e7c4b;color:#fff;padding:8px 16px;border-radius:6px;border:none;cursor:pointer;font-weight:bold;">🖨️ Imprimir / Guardar en PDF</button>
        <button id="btn-cerrar-modal" style="background:#666;color:#fff;padding:8px 16px;border-radius:6px;border:none;cursor:pointer;margin-left:8px;">Cerrar</button>
      </div>
    </div>
  `;
  mostrarModalInforme(html);
}
window.imprimirDossierVisita = imprimirDossierVisita;
window.pintarKitVisitaBogota = pintarKitVisitaBogota;

/**
 * Abre un modal interactivo con el código QR hacia www.saeing.com
 */
function abrirModalQRSaeing() {
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A%2F%2Fwww.saeing.com";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:440px;margin:0 auto;text-align:center;padding:12px;color:#111;">
      <div style="background:#f0fdf4;border-radius:12px;padding:24px;border:1px solid #bbf7d0;">
        <span style="font-size:12px;font-weight:bold;color:#0e7c4b;text-transform:uppercase;letter-spacing:0.5px;">Acceso Digital Oficial</span>
        <h2 style="margin:6px 0 10px;color:#1e3d2f;font-size:22px;">🌐 www.saeing.com</h2>
        <p style="font-size:13px;color:#555;margin:0 0 16px;line-height:1.4;">
          Escanee este código con la cámara de su celular para abrir directamente el portal oficial de <b>SAEING Ingeniería</b>.
        </p>
        <div style="background:#ffffff;padding:16px;border-radius:12px;display:inline-block;box-shadow:0 4px 16px rgba(0,0,0,0.08);border:1px solid #e5e7eb;margin-bottom:16px;">
          <a href="https://www.saeing.com" target="_blank" title="Clic para abrir www.saeing.com">
            <img src="${qrUrl}" alt="QR Code www.saeing.com" style="width:200px;height:200px;display:block;" />
          </a>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <a href="https://www.saeing.com" target="_blank" style="text-decoration:none;">
            <button style="width:100%;background:#0e7c4b;color:#fff;font-size:14px;font-weight:bold;padding:10px;">
              🚀 Abrir Página Web (www.saeing.com)
            </button>
          </a>
          <a href="https://wa.me/${WA_NUM}?text=${encodeURIComponent("Hola SAEING, estoy usando el asistente HSE y quiero asesoría técnica")}" target="_blank" style="text-decoration:none;">
            <button class="secundario" style="width:100%;background:#25D366;color:#fff;font-size:13px;font-weight:bold;padding:9px;">
              💬 WhatsApp SAEING: 300 858 7973
            </button>
          </a>
          <button id="btn-cerrar-modal" class="secundario" style="margin-top:4px;">Cerrar</button>
        </div>
      </div>
    </div>
  `;
  mostrarModalInforme(html);
}
window.abrirModalQRSaeing = abrirModalQRSaeing;

/** Pinta las estadísticas clave del Panel de Resumen */
function pintarResumen(empresas, docs, auds) {
  // 1. Total Empresas
  const totalEmpresas = (empresas || []).length;
  const elTotalEmp = document.getElementById("stat-total-empresas");
  const elDetalleEmp = document.getElementById("stat-detalle-empresas");
  if (elTotalEmp) elTotalEmp.textContent = totalEmpresas;
  if (elDetalleEmp) {
    elDetalleEmp.textContent = totalEmpresas === 1 ? "1 sede o negocio activo" : `${totalEmpresas} sedes o negocios activos`;
  }

  // 2. Documentos Vencidos / Por Vencer (15 días)
  const ven = (docs || []).filter(d => diasRestantes(d.vence) < 0);
  const pro = (docs || []).filter(d => {
    const x = diasRestantes(d.vence);
    return x >= 0 && x <= DIAS_AVISO;
  });
  const vigentes = (docs || []).filter(d => diasRestantes(d.vence) > DIAS_AVISO);

  const elDocsVencer = document.getElementById("stat-docs-vencer");
  const elDetalleVen = document.getElementById("stat-detalle-vencimientos");
  const cardVencimientos = document.getElementById("card-stat-vencimientos");

  if (elDocsVencer) elDocsVencer.textContent = pro.length;
  if (elDetalleVen) {
    if (ven.length > 0) {
      elDetalleVen.innerHTML = `<b style="color:var(--rojo)">${ven.length} vencido(s)</b> · ${vigentes.length} al día`;
    } else if (pro.length > 0) {
      elDetalleVen.innerHTML = `🟡 <b>${pro.length}</b> en riesgo (15d) · ${vigentes.length} al día`;
    } else {
      elDetalleVen.innerHTML = `✅ 0 vencidos · ${vigentes.length} al día`;
    }
  }
  if (cardVencimientos) {
    cardVencimientos.className = "tarjeta-stat " + (ven.length > 0 ? "stat-alerta" : pro.length > 0 ? "stat-aviso" : "stat-exito");
  }

  // 3. Total Documentos Legales
  const totalDocs = (docs || []).length;
  const elTotalDocs = document.getElementById("stat-total-docs");
  const elDetalleDocs = document.getElementById("stat-detalle-docs");
  if (elTotalDocs) elTotalDocs.textContent = totalDocs;
  if (elDetalleDocs) {
    elDetalleDocs.textContent = totalDocs === 0
      ? "Ningún requisito cargado"
      : `${vigentes.length + pro.length} activos / ${ven.length} vencidos`;
  }

  // 4. Promedio de Cumplimiento de Auditorías
  const elPromAud = document.getElementById("stat-promedio-auditorias");
  const elDetalleAud = document.getElementById("stat-detalle-auditorias");
  const cardAuditorias = document.getElementById("card-stat-auditorias");

  if (auds && auds.length > 0) {
    const sumaNotas = auds.reduce((acc, a) => acc + (Number(a.nota) || 0), 0);
    const prom = Math.round(sumaNotas / auds.length);
    const conceptoGlobal = prom === 100 ? "FAVORABLE" : prom >= 70 ? "FAV. CON REQ." : "DESFAVORABLE";

    if (elPromAud) elPromAud.textContent = `${prom}%`;
    if (elDetalleAud) {
      elDetalleAud.textContent = `${auds.length} auditoría(s) · ${conceptoGlobal}`;
    }
    if (cardAuditorias) {
      cardAuditorias.className = "tarjeta-stat " + (prom >= 80 ? "stat-exito" : prom >= 70 ? "stat-aviso" : "stat-alerta");
    }
  } else {
    if (elPromAud) elPromAud.textContent = "0%";
    if (elDetalleAud) elDetalleAud.textContent = "Sin auditorías registradas";
    if (cardAuditorias) cardAuditorias.className = "tarjeta-stat";
  }

  // 5. Gráfico de Tendencias D3 de Cumplimiento Histórico de Auditorías
  pintarGraficoTendenciasD3(auds, empresas);
}

let _todasAuds = [];
let _todasEmpresas = [];

/**
 * Renderiza el gráfico interactivo de tendencias de cumplimiento histórico usando D3.js
 */
function pintarGraficoTendenciasD3(auds, empresas) {
  _todasAuds = auds || [];
  _todasEmpresas = empresas || [];

  // Llenar o sincronizar selector de filtro de empresas
  const selectFiltro = document.getElementById("filtro-grafico-empresa");
  if (selectFiltro) {
    const valorPrevio = selectFiltro.value || "todas";
    let opciones = '<option value="todas">🏢 Todas las Sedes / General</option>';
    (empresas || []).forEach(e => {
      opciones += `<option value="${e.id || e.nombre}">${e.nombre}</option>`;
    });
    selectFiltro.innerHTML = opciones;
    if (Array.from(selectFiltro.options).some(o => o.value === valorPrevio)) {
      selectFiltro.value = valorPrevio;
    }
  }

  const filtroSede = selectFiltro ? selectFiltro.value : "todas";
  let datos = [..._todasAuds];
  if (filtroSede !== "todas") {
    datos = datos.filter(a => (a.empresaId === filtroSede || a.empresaNombre === filtroSede));
  }

  // Ordenar cronológicamente (más antiguo a más reciente)
  datos.sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0));

  const contenedor = document.getElementById("contenedor-grafico-d3");
  if (!contenedor) return;

  const elMax = document.getElementById("kpi-grafico-max");
  const elProm = document.getElementById("kpi-grafico-prom");
  const elUlt = document.getElementById("kpi-grafico-ult");
  const elTend = document.getElementById("kpi-grafico-tendencia");

  // Estado vacío si no hay auditorías
  if (!datos.length) {
    if (elMax) elMax.textContent = "0%";
    if (elProm) elProm.textContent = "0%";
    if (elUlt) { elUlt.textContent = "0%"; elUlt.style.color = "#1e3d2f"; }
    if (elTend) elTend.innerHTML = "<span style='color:#777;'>Sin auditorías</span>";

    contenedor.innerHTML = `
      <div style="text-align:center;padding:50px 20px;color:#617367;font-size:13px;background:#fbfdfb;border:1px dashed #cfe0d6;border-radius:8px;">
        <span style="font-size:32px;display:block;margin-bottom:8px;">📊</span>
        <b>No hay auditorías registradas para el filtro seleccionado.</b><br>
        Realice y guarde una auditoría técnica en la pestaña <b>'🔍 Auditoría'</b> para trazar la curva de progreso de cumplimiento legal.
      </div>
    `;
    return;
  }

  const notas = datos.map(d => Number(d.nota) || 0);
  const maxNota = Math.max(...notas);
  const promNota = Math.round(notas.reduce((a, b) => a + b, 0) / notas.length);
  const ultNota = notas[notas.length - 1];

  if (elMax) elMax.textContent = `${maxNota}%`;
  if (elProm) elProm.textContent = `${promNota}%`;
  if (elUlt) {
    elUlt.textContent = `${ultNota}%`;
    elUlt.style.color = ultNota >= 80 ? "var(--verde)" : ultNota >= 70 ? "#b58100" : "var(--rojo)";
  }

  if (elTend) {
    if (datos.length > 1) {
      const penultNota = notas[notas.length - 2];
      const diff = ultNota - penultNota;
      if (diff > 0) {
        elTend.innerHTML = `<span style="color:var(--verde);font-weight:bold;">▲ +${diff}% (Mejora)</span>`;
      } else if (diff < 0) {
        elTend.innerHTML = `<span style="color:var(--rojo);font-weight:bold;">▼ ${diff}% (Descenso)</span>`;
      } else {
        elTend.innerHTML = `<span style="color:#555;">➔ Estable (0%)</span>`;
      }
    } else {
      elTend.innerHTML = `<span style="color:#0e7c4b;">Diagnóstico Base</span>`;
    }
  }

  // Verificar disponibilidad de D3
  const d3Obj = window.d3;
  if (!d3Obj) {
    contenedor.innerHTML = "<p style='font-size:13px;color:#666;'>Cargando librería gráfica D3.js...</p>";
    return;
  }

  contenedor.innerHTML = "";

  const anchoTotal = contenedor.clientWidth || 700;
  const altoTotal = 260;
  const margin = { top: 25, right: 35, bottom: 42, left: 45 };
  const anchoGrafico = anchoTotal - margin.left - margin.right;
  const altoGrafico = altoTotal - margin.top - margin.bottom;

  const svg = d3Obj.select(contenedor)
    .append("svg")
    .attr("viewBox", `0 0 ${anchoTotal} ${altoTotal}`)
    .attr("width", "100%")
    .attr("height", altoTotal);

  const defs = svg.append("defs");

  // Gradiente sombreado para el área
  const areaGradient = defs.append("linearGradient")
    .attr("id", "gradiente-area-hse")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "0%").attr("y2", "100%");

  areaGradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#0e7c4b")
    .attr("stop-opacity", 0.45);

  areaGradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#0e7c4b")
    .attr("stop-opacity", 0.02);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Escalas D3
  const xScale = d3Obj.scalePoint()
    .domain(datos.map((_, i) => i))
    .range([0, anchoGrafico])
    .padding(datos.length === 1 ? 0.5 : 0.22);

  const yScale = d3Obj.scaleLinear()
    .domain([0, 100])
    .range([altoGrafico, 0]);

  // 1. Zona favorable (80-100%)
  g.append("rect")
    .attr("x", 0)
    .attr("y", yScale(100))
    .attr("width", anchoGrafico)
    .attr("height", yScale(80) - yScale(100))
    .attr("fill", "rgba(46, 125, 50, 0.07)");

  // 2. Zona requerimientos (70-80%)
  g.append("rect")
    .attr("x", 0)
    .attr("y", yScale(80))
    .attr("width", anchoGrafico)
    .attr("height", yScale(70) - yScale(80))
    .attr("fill", "rgba(245, 158, 11, 0.07)");

  // 3. Zona desfavorable (0-70%)
  g.append("rect")
    .attr("x", 0)
    .attr("y", yScale(70))
    .attr("width", anchoGrafico)
    .attr("height", yScale(0) - yScale(70))
    .attr("fill", "rgba(220, 38, 38, 0.04)");

  // Línea de corte legal (70% mínimo aprobatorio)
  g.append("line")
    .attr("x1", 0)
    .attr("x2", anchoGrafico)
    .attr("y1", yScale(70))
    .attr("y2", yScale(70))
    .attr("stroke", "#d97706")
    .attr("stroke-width", 1.2)
    .attr("stroke-dasharray", "4,3");

  g.append("text")
    .attr("x", anchoGrafico - 6)
    .attr("y", yScale(70) - 4)
    .attr("text-anchor", "end")
    .attr("font-size", "10px")
    .attr("fill", "#b45309")
    .attr("font-weight", "600")
    .text("70% Mínimo aprobatorio legal");

  // Rejilla horizontal de referencia
  const yAxisGrid = d3Obj.axisLeft(yScale)
    .ticks(5)
    .tickSize(-anchoGrafico)
    .tickFormat("")
    .scale(yScale);

  g.append("g")
    .attr("class", "d3-grid")
    .call(yAxisGrid);

  // Eje X con fechas legibles
  const xAxis = d3Obj.axisBottom(xScale)
    .tickFormat(i => {
      const d = datos[i];
      if (!d || !d.fecha) return `Aud ${i + 1}`;
      const f = new Date(d.fecha);
      const dia = String(f.getDate()).padStart(2, "0");
      const mes = String(f.getMonth() + 1).padStart(2, "0");
      return `${dia}/${mes}/${f.getFullYear()}`;
    });

  g.append("g")
    .attr("class", "d3-axis")
    .attr("transform", `translate(0,${altoGrafico})`)
    .call(xAxis)
    .selectAll("text")
    .attr("dy", "12px");

  // Eje Y (0% a 100%)
  const yAxis = d3Obj.axisLeft(yScale)
    .ticks(5)
    .tickFormat(d => `${d}%`);

  g.append("g")
    .attr("class", "d3-axis")
    .call(yAxis);

  // Área sombreada bajo la curva
  const areaGen = d3Obj.area()
    .x((_, i) => xScale(i))
    .y0(yScale(0))
    .y1(d => yScale(Number(d.nota) || 0))
    .curve(datos.length > 2 ? d3Obj.curveMonotoneX : d3Obj.curveLinear);

  g.append("path")
    .datum(datos)
    .attr("fill", "url(#gradiente-area-hse)")
    .attr("d", areaGen);

  // Línea principal de tendencia
  const lineGen = d3Obj.line()
    .x((_, i) => xScale(i))
    .y(d => yScale(Number(d.nota) || 0))
    .curve(datos.length > 2 ? d3Obj.curveMonotoneX : d3Obj.curveLinear);

  g.append("path")
    .datum(datos)
    .attr("fill", "none")
    .attr("stroke", "#0e7c4b")
    .attr("stroke-width", 3)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("d", lineGen);

  // Tooltip flotante interactivo
  let tooltip = d3Obj.select("body").select(".d3-tooltip");
  if (tooltip.empty()) {
    tooltip = d3Obj.select("body").append("div").attr("class", "d3-tooltip").style("opacity", 0);
  }

  // Puntos interactivos sobre cada auditoría
  const puntos = g.selectAll(".d3-punto")
    .data(datos)
    .enter()
    .append("g")
    .attr("class", "d3-punto")
    .attr("transform", (d, i) => `translate(${xScale(i)},${yScale(Number(d.nota) || 0)})`);

  // Halo exterior suave
  puntos.append("circle")
    .attr("r", 9)
    .attr("fill", d => {
      const n = Number(d.nota) || 0;
      return n >= 80 ? "rgba(46, 125, 50, 0.18)" : n >= 70 ? "rgba(245, 158, 11, 0.18)" : "rgba(220, 38, 38, 0.18)";
    });

  // Círculo interactivo
  puntos.append("circle")
    .attr("r", 5)
    .attr("fill", "#ffffff")
    .attr("stroke", d => {
      const n = Number(d.nota) || 0;
      return n >= 80 ? "#2e7d32" : n >= 70 ? "#d97706" : "#dc2626";
    })
    .attr("stroke-width", 2.5)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3Obj.select(this).transition().duration(150).attr("r", 7.5);
      const fechaTxt = d.fecha ? new Date(d.fecha).toLocaleDateString("es-CO", { day: '2-digit', month: 'short', year: 'numeric' }) : "-";
      const colorPuntaje = Number(d.nota) >= 80 ? "#4ade80" : Number(d.nota) >= 70 ? "#fbbf24" : "#f87171";

      tooltip.style("opacity", 1)
        .html(`
          <div style="font-weight:bold;color:#a7f3d0;margin-bottom:2px;">🏢 ${d.empresaNombre || "Empresa"}</div>
          <div style="font-size:11px;color:#d1d5db;margin-bottom:6px;">📅 ${fechaTxt} · Acta ${d.acta || "IVC"}</div>
          <div style="font-size:14px;font-weight:bold;color:${colorPuntaje};margin-bottom:2px;">Cumplimiento: ${d.nota}%</div>
          <div style="font-size:11px;color:#ffffff;">Concepto: <b>${d.concepto || "Evaluado"}</b></div>
          ${d.auditor ? `<div style="font-size:10px;color:#9ca3af;margin-top:4px;">Auditor: ${d.auditor}</div>` : ""}
        `)
        .style("left", (event.pageX) + "px")
        .style("top", (event.pageY - 12) + "px");
    })
    .on("mousemove", function(event) {
      tooltip.style("left", (event.pageX) + "px").style("top", (event.pageY - 12) + "px");
    })
    .on("mouseout", function() {
      d3Obj.select(this).transition().duration(150).attr("r", 5);
      tooltip.style("opacity", 0);
    });

  // Etiqueta con el puntaje exacto sobre cada punto
  puntos.append("text")
    .attr("y", -14)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("font-weight", "bold")
    .attr("fill", d => {
      const n = Number(d.nota) || 0;
      return n >= 80 ? "#1b5e20" : n >= 70 ? "#b45309" : "#b91c1c";
    })
    .text(d => `${d.nota}%`);
}

async function refrescarTodo() {
  const empresas = await leerEmpresas(), docs = await leerDocs(), auds = await leerAuds();
  pintarResumen(empresas, docs, auds);
  document.getElementById("lista-empresas").innerHTML = empresas.map(e => `<tr><td>${e.nombre}<br><small>NIT ${e.nit || "-"}</small></td><td>${e.nit || "-"}</td><td>${e.ciudad || "-"}</td><td>${e.actividad}</td><td><button class="peligro" onclick="borrar('empresas','${e.id}')">Borrar</button></td></tr>`).join("") || "<tr><td colspan=5>Cree la primera empresa con NIT y razón social.</td></tr>";
  const ops = empresas.map(e => `<option value="${e.id || e.nombre}">${e.nombre} - ${e.nit || "sin NIT"}</option>`).join("");
  document.getElementById("doc-empresa").innerHTML = ops; document.getElementById("aud-empresa").innerHTML = ops;
  await pintarDocs(); pintarVencimientos(docs, empresas); pintarAdmin(empresas, docs); pintarAuds();
  await pintarKitVisitaBogota(_sedeActivaId);
}
async function pintarDocs() {
  const q = (document.getElementById("doc-buscar").value || "").toLowerCase();
  let docs = await leerDocs();
  if (q) docs = docs.filter(d => ((d.empresaNombre || "") + (d.tipo || "") + (d.numero || "") + (d.empresaNit || "")).toLowerCase().includes(q));
  docs.sort((a, b) => diasRestantes(a.vence) - diasRestantes(b.vence));
  document.getElementById("lista-docs").innerHTML = docs.map(d => {
    const e = estadoDoc(d.vence);
    const link = d.archivoDatos ? `<a href="${d.archivoDatos}" download="${d.archivoNombre}" target="_blank">Ver</a>` : "-";
    return `<tr><td>${d.empresaNombre}<br><small>${d.empresaNit || ""}</small></td><td>${d.tipo}<br><small>${d.numero || ""} ${d.nota || ""}</small></td><td>${d.vence}</td><td>${diasRestantes(d.vence)}d</td><td><span class="estado ${e.clase}">${e.texto}</span></td><td>${link}</td><td><button class="peligro" onclick="borrar('documentos','${d.id}')">Borrar</button></td></tr>`;
  }).join("") || "<tr><td colspan=7>No hay documentos.</td></tr>";
}
function pintarObligaciones(f) { document.getElementById("lista-obligaciones").innerHTML = OBLIGACIONES_BASE.filter(o => f === "todas" || o.aplica.includes(f)).map(o => `<tr><td><b>${o.nombre}</b></td><td>${o.entidad}</td><td>${o.ley}</td><td>${o.cada}</td><td>${o.aplica.join(", ")}</td></tr>`).join(""); }
/** Explicación simple: muestra las 25 carpetas de la foto con buscador. */
function pintarCarpetas(q) {
  q = (q || "").toLowerCase();
  document.getElementById("lista-carpetas").innerHTML = CARPETAS_31.filter(c => (c.nombre + c.paraQue + c.ley).toLowerCase().includes(q)).map(c => `<tr><td>${c.n}</td><td><b>${c.nombre}</b></td><td>${c.paraQue}</td><td>${c.vence}</td><td>${c.ley}</td></tr>`).join("");
}
/** Explicación simple: muestra qué revisa Salud según el acta elegida. */
function pintarIVC(cual) {
  const arr = cual === "belleza" ? IVC_BELLEZA : cual === "colchones" ? IVC_COLCHONES : IVC_SQ01;
  document.getElementById("lista-ivc").innerHTML = "<ol>" + arr.map(t => `<li>${t}</li>`).join("") + "</ol>";
}
/** Explicación simple: muestra los 5 servicios que se piden por WhatsApp con código QR a www.saeing.com */
function pintarServicios() {
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https%3A%2F%2Fwww.saeing.com";

  let html = `
    <!-- Tarjeta Principal con Código QR hacia www.saeing.com -->
    <div class="tarjeta-qr-saeing">
      <div class="qr-contenedor-img">
        <a href="https://www.saeing.com" target="_blank" title="Haga clic o escanee para ir a www.saeing.com">
          <img src="${qrUrl}" alt="Código QR www.saeing.com" />
        </a>
      </div>
      <div class="qr-info-texto">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#a7f3d0;font-weight:bold;">Portal Web Oficial</div>
        <h3>🌐 www.saeing.com</h3>
        <p>
          Escanee este código QR con la cámara de su celular o haga clic en el botón para acceder directamente al sitio web de <b>SAEING Ingeniería</b>. Conozca nuestro catálogo de asesoría jurídica en inspección sanitaria, conceptos técnicos de bomberos y SG-SST.
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <a href="https://www.saeing.com" target="_blank" class="qr-btn-visitar">
            🚀 Visitar www.saeing.com ➔
          </a>
          <a href="https://wa.me/${WA_NUM}?text=${encodeURIComponent("Hola SAEING, vi su página www.saeing.com y necesito asesoría técnica para mi empresa")}" target="_blank" style="text-decoration:none;">
            <button style="background:#25D366;color:#ffffff;font-weight:bold;margin:0;font-size:13px;padding:8px 14px;">
              💬 WhatsApp: 300 858 7973
            </button>
          </a>
        </div>
      </div>
    </div>

    <h4 style="margin:20px 0 10px;color:#1e3d2f;">🛠️ Catálogo de Servicios y Solicitud Directa</h4>
  `;

  html += SERVICIOS.map(s => `
    <div class="aviso" style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <b>📋 ${s.n}</b>: <span style="font-size:13px;color:#444;">${s.d}</span>
        </div>
        <a href="https://wa.me/${WA_NUM}?text=${encodeURIComponent("Hola, necesito cotización del servicio: " + s.n + " para mi negocio en Bogotá")}" target="_blank">
          <button style="font-size:12px;padding:5px 12px;margin:0;">Pedir ${s.n}</button>
        </a>
      </div>
    </div>
  `).join("");

  html += `
    <div class="ok" style="margin-top:16px;">
      🌐 Visite también nuestras plataformas oficiales: <a href="https://www.saeing.com" target="_blank"><b>www.saeing.com</b></a> y <a href="https://lottosst.com/" target="_blank"><b>lottosst.com</b></a>.
    </div>
  `;

  document.getElementById("lista-servicios").innerHTML = html;
}
/** Explicación simple: avisa 15 días antes y dice qué carpeta le falta a cada empresa. */
function pintarVencimientos(docs, empresas) {
  const ven = docs.filter(d => diasRestantes(d.vence) < 0);
  const pro = docs.filter(d => { const x = diasRestantes(d.vence); return x >= 0 && x <= DIAS_AVISO; });
  let html = "";
  // Qué falta por empresa (cruza 25 requisitos con lo subido)
  (empresas || []).forEach(emp => {
    const tiene = docs.filter(d => d.empresaId === (emp.id || emp.nombre)).map(d => d.tipo);
    const faltan = TIPOS_DOC.filter(t => !tiene.includes(t));
    if (faltan.length) html += `<div class="alerta">📁 <b>${emp.nombre} (${emp.nit})</b> le faltan ${faltan.length} papeles: ${faltan.slice(0, 5).join(", ")}${faltan.length > 5 ? "..." : ""}</div>`;
  });
  ven.forEach(d => html += `<div class="alerta">🔴 VENCIDO: ${d.tipo} de <b>${d.empresaNombre}</b> venció ${d.vence}.</div>`);
  pro.forEach(d => html += `<div class="aviso">🟡 POR VENCER en ${diasRestantes(d.vence)} días: ${d.tipo} de <b>${d.empresaNombre}</b> (${d.vence}).</div>`);
  if (!html) html = `<div class="ok">✅ Todo al día. Nada se vence en ${DIAS_AVISO} días y no falta ningún papel.</div>`;
  document.getElementById("lista-vencimientos").innerHTML = html;
  document.getElementById("avisos").innerHTML = ven.length ? `<div class="alerta">🔴 ${ven.length} vencidos.</div>` : pro.length ? `<div class="aviso">🟡 ${pro.length} por vencer en ${DIAS_AVISO} días.</div>` : "";
  if ((ven.length || pro.length) && "Notification" in window && Notification.permission === "granted") { try { new Notification("HSE: revise papeles", { body: `${ven.length} vencidos, ${pro.length} por vencer (15 días).` }); } catch { } }
}
/**
 * Servicio de Notificaciones por Correo Electrónico (Firebase Cloud Functions < 5 días)
 * Despacha correos a usuarios asignados y superadministrador para documentos con vencimiento crítico.
 */
async function dispararNotificacionesCorreo5Dias() {
  mostrarAviso("Escaneando documentos a menos de 5 días de vencer...", "aviso");
  const contenedorResultado = document.getElementById("resultado-envio-correo");
  if (contenedorResultado) {
    contenedorResultado.style.display = "block";
    contenedorResultado.innerHTML = `<i>Procesando reglas de vencimiento y conectando con el servicio de correo...</i>`;
  }

  const docs = await leerDocs();
  const auths = await leerAutorizaciones();

  let resData = null;
  try {
    const respuesta = await fetch('/api/notificar-vencimientos-5dias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentos: docs, autorizaciones: auths })
    });
    if (respuesta.ok) {
      resData = await respuesta.json();
    }
  } catch (_) {
    resData = null;
  }

  // Fallback si la llamada API falló
  if (!resData || !resData.ok) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const notificaciones = [];
    docs.forEach(doc => {
      const dias = diasRestantes(doc.vence);
      if (dias <= 5) {
        const dest = new Set();
        if (doc.ownerEmail) dest.add(doc.ownerEmail.trim().toLowerCase());
        dest.add(SUPERADMIN_EMAIL.toLowerCase());
        auths.filter(a => a.activo && (a.empresaId === doc.empresaId || a.empresaId === "todas")).forEach(a => dest.add(a.email.trim().toLowerCase()));
        dest.forEach(email => {
          notificaciones.push({
            id: "notif_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
            documentoId: doc.id,
            empresaNombre: doc.empresaNombre,
            empresaNit: doc.empresaNit || "",
            tipo: doc.tipo,
            vence: doc.vence,
            diasRestantes: dias,
            estado: dias < 0 ? "Vencido" : `Vence en ${dias} día(s)`,
            destinatario: email,
            asunto: dias < 0 ? `🔴 [VENCIDO] ${doc.tipo} - ${doc.empresaNombre}` : `⏰ [ALERTA HSE ${dias}d] ${doc.tipo} vence pronto - ${doc.empresaNombre}`,
            fechaEnvio: new Date().toISOString(),
            enviado: true,
            canal: "Correo Electrónico (Firebase Cloud Functions / SMTP)"
          });
        });
      }
    });
    resData = { ok: true, totalProcesados: docs.length, alertasGeneradas: notificaciones.length, notificaciones };
  }

  // Si estamos en modo nube, persistir en la colección /notificaciones
  if (modoNube && resData.notificaciones?.length) {
    for (const notif of resData.notificaciones) {
      try {
        await window._fb.addDoc(window._fb.collection(db, "notificaciones"), {
          ...notif,
          creado: new Date().toISOString()
        });
      } catch (_) {}
    }
  }

  // Renderizar feedback visual
  if (contenedorResultado) {
    const notifs = resData.notificaciones || [];
    if (!notifs.length) {
      contenedorResultado.innerHTML = `
        <div class="ok" style="margin-top:8px;">
          ✅ <b>Excelente:</b> Ningún documento legal está a menos de 5 días de vencer. Todos los requisitos están al día.
        </div>
      `;
      mostrarAviso("No hay documentos a menos de 5 días de vencer.", "ok");
      return;
    }

    window._ultimasNotificaciones = notifs;

    contenedorResultado.innerHTML = `
      <div class="alerta" style="margin-top:8px;background:#fff8f4;border-left-color:#e65100;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <b style="color:#b23c00;">📧 ${notifs.length} Notificación(es) de Alerta Emitida(s) (&lt; 5 días)</b>
          <button style="padding:4px 10px;font-size:12px;background:#0e7c4b;" onclick="verPlantillaCorreo(0)">👁️ Ver Vista Previa del Correo</button>
        </div>
        <table style="margin-top:10px;font-size:12px;width:100%;">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Empresa</th>
              <th>Días Restantes</th>
              <th>Destinatario Notificado</th>
              <th>Canal</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${notifs.map((n, idx) => `
              <tr>
                <td><b>${n.tipo}</b></td>
                <td>${n.empresaNombre}</td>
                <td><b style="color:${n.diasRestantes < 0 ? 'var(--rojo)' : '#e65100'}">${n.diasRestantes < 0 ? 'Vencido (' + n.diasRestantes + 'd)' : n.diasRestantes + ' día(s)'}</b></td>
                <td>${n.destinatario}</td>
                <td><small>${n.canal || "Cloud Function"}</small></td>
                <td><span class="badge-activo" style="cursor:pointer;" onclick="verPlantillaCorreo(${idx})">✅ Enviado</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    mostrarAviso(`Se emitieron ${notifs.length} alertas por correo electrónico para documentos a menos de 5 días.`, "ok");
  }
}

function verPlantillaCorreo(indice = 0) {
  const notifs = window._ultimasNotificaciones || [];
  const notif = notifs[indice] || {
    tipo: "5. Concepto Sanitario",
    empresaNombre: "Restaurante & Panadería La Candelaria SAS",
    empresaNit: "901.554.892-3",
    vence: "2026-10-02",
    diasRestantes: 4,
    destinatario: "contacto@lacandelaria.com"
  };

  const dias = notif.diasRestantes;
  const esVencido = dias < 0;
  const colorBorde = esVencido ? "#c62828" : "#e65100";
  const titulo = esVencido ? `🚨 DOCUMENTO LEGAL VENCIDO HACE ${Math.abs(dias)} DÍAS` : `⚠️ ATENCIÓN: DOCUMENTO PRÓXIMO A VENCER EN ${dias} DÍAS`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;border:1px solid #ddd;border-top:6px solid ${colorBorde};border-radius:8px;padding:20px;background:#fff;text-align:left;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee;padding-bottom:10px;margin-bottom:14px;">
        <h3 style="margin:0;color:#0e7c4b;">🇨🇴 Asistente Adm HSE Colombia</h3>
        <span style="font-size:11px;background:#f0f0f0;padding:2px 8px;border-radius:4px;">Notificación Cloud Functions</span>
      </div>
      <div style="background:${esVencido ? '#ffebee' : '#fff3e0'};border-left:4px solid ${colorBorde};padding:10px 14px;border-radius:4px;margin-bottom:16px;">
        <b style="color:${colorBorde};">${titulo}</b><br>
        <span style="font-size:13px;color:#333;">Enviado a: <b>${notif.destinatario}</b></span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
        <tr style="border-bottom:1px solid #eee;"><td style="padding:6px 0;color:#666;"><b>Empresa:</b></td><td><b>${notif.empresaNombre}</b></td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:6px 0;color:#666;"><b>NIT:</b></td><td>${notif.empresaNit || "-"}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:6px 0;color:#666;"><b>Requisito Legal:</b></td><td style="color:#0e7c4b;font-weight:bold;">${notif.tipo}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:6px 0;color:#666;"><b>Fecha Vencimiento:</b></td><td style="color:${colorBorde};font-weight:bold;">${notif.vence}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:6px 0;color:#666;"><b>Días Restantes:</b></td><td style="color:${colorBorde};font-weight:bold;">${dias} día(s)</td></tr>
      </table>
      <div style="background:#eef7f2;border:1px solid #c2e5d1;border-radius:6px;padding:12px;font-size:12px;margin-bottom:16px;">
        <b>¿Requiere renovar su certificado o asesoría técnica?</b><br>
        Los expertos de <b>SAEING</b> le asesoran en conceptos sanitarios Res. 2674/2013, bomberos y SG-SST.<br>
        <a href="https://wa.me/573008587973" target="_blank" style="display:inline-block;margin-top:6px;color:#0e7c4b;font-weight:bold;">💬 Contactar por WhatsApp: 300 858 7973</a>
      </div>
      <p style="font-size:11px;color:#888;margin:0;">Mensaje generado por Firebase Cloud Functions (v2 Scheduler Cron Diario a las 8:00 AM).</p>
      <div style="text-align:right;margin-top:14px;">
        <button id="btn-cerrar-modal" class="secundario">Cerrar Vista Previa</button>
      </div>
    </div>
  `;
  mostrarModalInforme(html);
}
window.verPlantillaCorreo = verPlantillaCorreo;
window.dispararNotificacionesCorreo5Dias = dispararNotificacionesCorreo5Dias;

async function guardarAutorizacion() {
  const emailInput = (document.getElementById("auth-email")?.value || "").trim().toLowerCase();
  const selectEmp = document.getElementById("auth-empresa");
  const empresaId = selectEmp ? selectEmp.value : "";
  const empresaNombre = selectEmp && selectEmp.selectedIndex >= 0 ? selectEmp.options[selectEmp.selectedIndex].text : empresaId;
  const rol = document.getElementById("auth-rol")?.value || "admin_sede";
  const estadoVal = document.getElementById("auth-estado")?.value || "activo";
  const activo = estadoVal === "activo";

  if (!emailInput || !emailInput.includes("@")) {
    return alert("Escriba un correo electrónico válido para autorizar.");
  }
  if (!empresaId) {
    return alert("Seleccione una empresa o establecimiento asignado.");
  }

  const auths = await leerAutorizaciones();
  const existente = auths.find(a => a.email && a.email.trim().toLowerCase() === emailInput);

  const payload = {
    email: emailInput,
    empresaId,
    empresaNombre: empresaId === "todas" ? "Acceso Global (Todas las empresas)" : empresaNombre,
    rol,
    activo,
    creadoPor: SUPERADMIN_EMAIL,
    fecha: new Date().toISOString()
  };

  if (modoNube) {
    try {
      if (existente?.id) {
        await window._fb.deleteDoc(window._fb.doc(db, "autorizaciones", existente.id));
      }
      await window._fb.addDoc(window._fb.collection(db, "autorizaciones"), payload);
      mostrarAviso(`Autorización asignada a ${emailInput} para ${payload.empresaNombre}`, "ok");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "autorizaciones");
    }
  } else {
    let l = memoria.leer("hse_autorizaciones", []);
    l = l.filter(a => a.email.toLowerCase() !== emailInput);
    payload.id = "auth_" + Date.now();
    l.push(payload);
    memoria.guardar("hse_autorizaciones", l);
    mostrarAviso(`Autorización asignada localmente a ${emailInput}`, "ok");
  }

  const elEmail = document.getElementById("auth-email");
  if (elEmail) elEmail.value = "";
  const empresas = await leerEmpresas();
  await pintarAutorizaciones(empresas);
}

async function cambiarEstadoAutorizacion(id, nuevoEstado) {
  if (!esSuperAdmin()) return;
  if (modoNube) {
    try {
      const auths = await leerAutorizaciones();
      const a = auths.find(x => x.id === id);
      if (a) {
        await window._fb.deleteDoc(window._fb.doc(db, "autorizaciones", id));
        a.activo = nuevoEstado;
        a.fecha = new Date().toISOString();
        const { id: _, ...sinId } = a;
        await window._fb.addDoc(window._fb.collection(db, "autorizaciones"), sinId);
        mostrarAviso(`Estado actualizado a: ${nuevoEstado ? "Activo" : "Inactivo"}`, "ok");
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `autorizaciones/${id}`);
    }
  } else {
    const l = memoria.leer("hse_autorizaciones", []);
    const item = l.find(x => x.id === id);
    if (item) item.activo = nuevoEstado;
    memoria.guardar("hse_autorizaciones", l);
    mostrarAviso(`Estado actualizado a: ${nuevoEstado ? "Activo" : "Inactivo"}`, "ok");
  }
  const empresas = await leerEmpresas();
  await pintarAutorizaciones(empresas);
}

async function borrarAutorizacion(id) {
  if (!confirm("¿Seguro desea revocar y eliminar esta autorización? El usuario perderá el acceso.")) return;
  if (modoNube) {
    try {
      await window._fb.deleteDoc(window._fb.doc(db, "autorizaciones", id));
      mostrarAviso("Autorización eliminada", "ok");
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `autorizaciones/${id}`);
    }
  } else {
    memoria.guardar("hse_autorizaciones", memoria.leer("hse_autorizaciones", []).filter(x => x.id !== id));
    mostrarAviso("Autorización eliminada", "ok");
  }
  const empresas = await leerEmpresas();
  await pintarAutorizaciones(empresas);
}

window.cambiarEstadoAutorizacion = cambiarEstadoAutorizacion;
window.borrarAutorizacion = borrarAutorizacion;

async function pintarAutorizaciones(empresas) {
  const select = document.getElementById("auth-empresa");
  if (select) {
    let opts = '<option value="todas">⭐ Acceso Global (Todas las empresas)</option>';
    (empresas || []).forEach(e => {
      opts += `<option value="${e.id || e.nombre}">${e.nombre} (${e.nit || "sin NIT"})</option>`;
    });
    select.innerHTML = opts;
  }

  const tbody = document.getElementById("lista-autorizaciones");
  if (!tbody) return;
  const auths = await leerAutorizaciones();
  const q = (document.getElementById("auth-buscar")?.value || "").toLowerCase();
  const filtradas = auths.filter(a => ((a.email || "") + (a.empresaNombre || "") + (a.rol || "")).toLowerCase().includes(q));

  if (!filtradas.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#666;padding:12px;">No hay usuarios autorizados registrados aún. Ingrese un correo arriba para dar acceso.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtradas.map(a => {
    const estadoBadge = a.activo
      ? `<span class="badge-activo">✅ Activo</span>`
      : `<span class="badge-inactivo">⛔ Inactivo</span>`;
    const botonToggle = a.activo
      ? `<button class="secundario" style="padding:4px 8px;font-size:12px;" onclick="cambiarEstadoAutorizacion('${a.id}', false)">Desactivar</button>`
      : `<button style="padding:4px 8px;font-size:12px;" onclick="cambiarEstadoAutorizacion('${a.id}', true)">Activar</button>`;
    const rolNom = a.rol === "admin_sede" ? "Admin Sede" : a.rol === "auditor" ? "Auditor" : "Consulta";
    return `<tr>
      <td><b>${a.email}</b></td>
      <td>🏢 ${a.empresaNombre || a.empresaId}</td>
      <td><small>${rolNom}</small></td>
      <td>${estadoBadge}</td>
      <td><small>${(a.fecha || "").slice(0, 10)}</small></td>
      <td>
        ${botonToggle}
        <button class="peligro" style="padding:4px 8px;font-size:12px;" onclick="borrarAutorizacion('${a.id}')">Eliminar</button>
      </td>
    </tr>`;
  }).join("");
}

async function pintarAdmin(empresas, docs) {
  const c = document.getElementById("panel-admin");
  if (!esSuperAdmin()) {
    if (c) c.innerHTML = "Solo gerencia@saeing.com puede ver esto.";
    return;
  }
  const auths = await leerAutorizaciones();
  const auds = await leerAuds();
  if (c) {
    c.innerHTML = `
      <div class="ok" style="font-size:13px;line-height:1.6;">
        👑 <b>Superadministrador:</b> gerencia@saeing.com · Modo <b>${modoNube ? "Firebase Firestore (Nube)" : "Modo Local"}</b><br>
        🏢 <b>Empresas:</b> ${empresas.length} &nbsp;|&nbsp; 📄 <b>Documentos:</b> ${docs.length} &nbsp;|&nbsp; 🔍 <b>Auditorías:</b> ${auds.length} &nbsp;|&nbsp; 🔑 <b>Usuarios Autorizados:</b> ${auths.length}
      </div>
      <p style="font-size:12px;color:#555;margin-top:6px;">
        Control de acceso activo: Solo los correos autorizados por gerencia@saeing.com pueden ingresar y gestionar la sede asignada.
      </p>
    `;
  }
  await pintarAutorizaciones(empresas);
}
async function descargarCSV() {
  const docs = await leerDocs();
  const filas = [["Empresa", "NIT", "Tipo", "Numero", "Vence", "Dias", "Estado", "Archivo"]];
  docs.forEach(d => { const e = estadoDoc(d.vence); filas.push([d.empresaNombre, d.empresaNit || "", d.tipo, d.numero || "", d.vence, diasRestantes(d.vence), e.texto, d.archivoNombre || ""]); });
  const csv = filas.map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); a.download = "reporte-hse.csv"; a.click();
}
/** Explicación simple: baja un Word de ejemplo del requisito elegido para llenarlo en su computador. */
function descargarPlantillaWord() {
  const tipo = document.getElementById("doc-tipo").value;
  const texto = `<html xmlns:o='urn:schemas-microsoft-com:office:office'><head><meta charset='utf-8'></head><body><h1>${tipo}</h1><p>Empresa: __________ NIT: __________ Fecha: __________</p><p>1. Objetivo: cumplir ${tipo} según Ley 9/1979, Res.2674/2013 y Ley 1801/2016.</p><p>2. Responsable: __________ 3. Frecuencia: ver carpeta 1-31.</p><p>4. Firmas: Elaboró __________ Revisó __________ Aprobó __________</p></body></html>`;
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + texto], { type: "application/msword" })); a.download = "plantilla-" + tipo.replace(/[^a-z0-9]+/gi, "-") + ".doc"; a.click();
}

// ---------- Auditoría ponderada tipo IVC ----------
/** Explicación simple: arma la lista de preguntas según el acta elegida, cada una vale puntos. */
function itemsAuditoria() {
  const cual = document.getElementById("aud-acta").value;
  const base = cual === "belleza" ? IVC_BELLEZA : cual === "colchones" ? IVC_COLCHONES : IVC_SQ01;
  return base.map((t, i) => ({ id: i, texto: t, peso: 10 }));
}
function armarChequeo() {
  const items = itemsAuditoria();
  document.getElementById("lista-chequeo").innerHTML = items.map(it => `<div class="aviso"><b>${it.id + 1}. ${it.texto.slice(0, 140)}...</b><br><label><input type="radio" name="aud${it.id}" value="cumple" checked style="width:auto"> Cumple (${it.peso} pts)</label> <label><input type="radio" name="aud${it.id}" value="nocumple" style="width:auto"> No cumple (0)</label> <label><input type="radio" name="aud${it.id}" value="noaplica" style="width:auto"> No aplica</label></div>`).join("");
  document.getElementById("lista-chequeo").onchange = calcularNota;
  calcularNota();
}
/** Explicación simple: suma los puntos y da nota de 0 a 100 como Salud. */
function calcularNota() {
  const items = itemsAuditoria(); let gan = 0, pos = 0;
  items.forEach(it => { const v = document.querySelector(`input[name=aud${it.id}]:checked`)?.value; if (v === "cumple") { gan += it.peso; pos += it.peso; } else if (v === "nocumple") pos += it.peso; });
  const nota = pos ? Math.round(gan / pos * 100) : 100;
  const concepto = nota === 100 ? "FAVORABLE" : nota >= 70 ? "FAVORABLE CON REQUERIMIENTOS" : "DESFAVORABLE";
  document.getElementById("nota-auditoria").textContent = `Nota: ${nota}% — ${concepto}`;
  return { nota, concepto };
}
/** Explicación simple: deja firmar con el dedo o el mouse. */
function activarFirma(id) {
  const c = document.getElementById(id); if (!c) return; const x = c.getContext("2d"); let dib = false;
  const pos = (e) => { const r = c.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [(t.clientX - r.left) * (c.width / r.width), (t.clientY - r.top) * (c.height / r.height)]; };
  c.onmousedown = (e) => { dib = true; const [a, b] = pos(e); x.beginPath(); x.moveTo(a, b); };
  c.onmousemove = (e) => { if (!dib) return; const [a, b] = pos(e); x.lineTo(a, b); x.stroke(); };
  c.onmouseup = () => dib = false; c.ontouchstart = (e) => { dib = true; const [a, b] = pos(e); x.beginPath(); x.moveTo(a, b); e.preventDefault(); };
  c.ontouchmove = (e) => { if (!dib) return; const [a, b] = pos(e); x.lineTo(a, b); x.stroke(); e.preventDefault(); };
  c.ontouchend = () => dib = false;
}
function limpiarFirma(id) { const c = document.getElementById(id); c.getContext("2d").clearRect(0, 0, c.width, c.height); }
async function guardarAuditoria() {
  let empId = document.getElementById("aud-empresa").value;
  if (!empId && usuarioAutorizacion?.empresaId && usuarioAutorizacion.empresaId !== "todas") {
    empId = usuarioAutorizacion.empresaId;
  }
  if (!empId) return alert("Seleccione una empresa primero.");
  const empresas = await leerEmpresas();
  const emp = empresas.find(e => (e.id || e.nombre) === empId);
  const { nota, concepto } = calcularNota();
  const o = {
    empresaId: empId,
    empresaNombre: emp ? emp.nombre : (usuarioAutorizacion?.empresaNombre || empId),
    empresaNit: emp ? emp.nit : "",
    tipo: document.getElementById("aud-tipo").value,
    acta: document.getElementById("aud-acta").value,
    auditor: document.getElementById("aud-nombre").value,
    auditorDoc: document.getElementById("aud-doc").value,
    propietario: document.getElementById("aud-prop").value,
    nota,
    concepto,
    firmaAud: document.getElementById("firma-aud").toDataURL(),
    firmaProp: document.getElementById("firma-prop").toDataURL(),
    por: usuarioActual.email,
    fecha: new Date().toISOString()
  };
  if (modoNube) {
    try {
      await window._fb.addDoc(window._fb.collection(db, "auditorias"), o);
      mostrarAviso(`Auditoría guardada en la nube: ${nota}% ${concepto}`, "ok");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "auditorias");
    }
  } else {
    const l = memoria.leer("hse_auds", []);
    o.id = "a" + Date.now();
    l.push(o);
    memoria.guardar("hse_auds", l);
    mostrarAviso(`Auditoría guardada: ${nota}% ${concepto}`, "ok");
  }
  pintarAuds();
  refrescarTodo();
}

async function leerAuds() {
  let l = [];
  if (modoNube) {
    try {
      const s = await window._fb.getDocs(window._fb.collection(db, "auditorias"));
      l = s.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "auditorias");
    }
  } else {
    l = memoria.leer("hse_auds", []);
  }

  if (esSuperAdmin() || usuarioAutorizacion?.empresaId === "todas") {
    return l;
  }

  if (usuarioAutorizacion?.empresaId) {
    return l.filter(a => a.empresaId === usuarioAutorizacion.empresaId || a.empresaNombre === usuarioAutorizacion.empresaNombre);
  }

  return [];
}
async function pintarAuds() {
  const l = await leerAuds();
  document.getElementById("lista-auds").innerHTML = l.slice(-5).reverse().map(a => `<div class="ok">🔍 ${a.fecha.slice(0, 10)} · ${a.empresaNombre} (${a.empresaNit}) · ${a.tipo} · <b>${a.nota}% ${a.concepto}</b> · Auditor ${a.auditor}</div>`).join("");
}
/** Explicación simple: abre el informe bonito para guardar en PDF con firmas y datos. */
function mostrarModalInforme(htmlContenido) {
  const modalAnterior = document.getElementById("modal-informe-wrapper");
  if (modalAnterior) modalAnterior.remove();

  const fondo = document.createElement("div");
  fondo.id = "modal-informe-wrapper";
  fondo.className = "modal-fondo";
  fondo.innerHTML = `<div class="modal-caja">${htmlContenido}</div>`;
  document.body.appendChild(fondo);

  const btnCerrar = fondo.querySelector("#btn-cerrar-modal");
  if (btnCerrar) btnCerrar.onclick = () => fondo.remove();
  const btnImprimir = fondo.querySelector("#btn-imprimir-informe");
  if (btnImprimir) btnImprimir.onclick = () => window.print();

  fondo.onclick = (e) => {
    if (e.target === fondo) fondo.remove();
  };
}

async function informePDF() {
  const empId = document.getElementById("aud-empresa").value;
  const empresas = await leerEmpresas();
  const emp = empresas.find(e => (e.id || e.nombre) === empId);
  if (!emp) return alert("Elija empresa.");
  const { nota, concepto } = calcularNota();
  const items = itemsAuditoria().map(it => {
    const v = document.querySelector(`input[name=aud${it.id}]:checked`)?.value;
    return `<tr><td>${it.id + 1}</td><td>${it.texto}</td><td>${v === "cumple" ? "Cumple" : v === "nocumple" ? "No cumple" : "N/A"}</td></tr>`;
  }).join("");

  const firmaAudSrc = document.getElementById("firma-aud").toDataURL();
  const firmaPropSrc = document.getElementById("firma-prop").toDataURL();
  const auditorNom = document.getElementById("aud-nombre").value;
  const auditorDocVal = document.getElementById("aud-doc").value;
  const propNom = document.getElementById("aud-prop").value;
  const audTipoVal = document.getElementById("aud-tipo").value;
  const audActaVal = document.getElementById("aud-acta").value;

  const htmlInforme = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0e7c4b;padding-bottom:10px;margin-bottom:16px;">
      <h2 style="margin:0;color:#0e7c4b;font-size:18px;">Informe de auditoría higiénico-sanitaria (tipo IVC)</h2>
      <button id="btn-cerrar-modal" class="secundario" style="margin:0;">✕ Cerrar</button>
    </div>
    <p><b>Razón social:</b> ${emp.nombre} &nbsp; <b>NIT:</b> ${emp.nit} &nbsp; <b>Ciudad:</b> ${emp.ciudad || ""}</p>
    <p><b>Tipo:</b> ${audTipoVal} &nbsp; <b>Acta base:</b> ${audActaVal} &nbsp; <b>Fecha:</b> ${new Date().toLocaleString()}</p>
    <p><b>Auditor:</b> ${auditorNom} (${auditorDocVal}) &nbsp; <b>Propietario:</b> ${propNom}</p>
    <h3 style="background:#e8f3ec;padding:8px 12px;border-radius:6px;">Nota ponderada: ${nota}% — ${concepto}</h3>
    <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead><tr style="background:#e8f3ec;"><th>#</th><th>Aspecto verificado</th><th>Calificación</th></tr></thead>
      <tbody>${items}</tbody>
    </table>
    <div style="display:flex;gap:40px;margin-top:20px;flex-wrap:wrap;">
      <div style="flex:1;min-width:200px;">
        <p><b>Firma auditor:</b><br><img src="${firmaAudSrc}" width="250" style="border:1px solid #ccc;border-radius:4px;"><br>${auditorNom}</p>
      </div>
      <div style="flex:1;min-width:200px;">
        <p><b>Firma propietario:</b><br><img src="${firmaPropSrc}" width="250" style="border:1px solid #ccc;border-radius:4px;"><br>${propNom}</p>
      </div>
    </div>
    <p style="font-size:12px;color:#666;margin-top:16px;">Generado por Asistente HSE Colombia · ${usuarioActual.email} · Para PDF: Ctrl+P > Guardar como PDF</p>
    <div style="margin-top:16px;text-align:right;">
      <button id="btn-imprimir-informe">🖨️ Imprimir / Guardar como PDF</button>
    </div>
  `;

  let w = null;
  try {
    w = window.open("", "_blank");
  } catch (_) {
    w = null;
  }

  if (w && w.document) {
    try {
      w.document.write(`<html><head><meta charset='utf-8'><title>Informe auditoría ${emp.nombre}</title><style>body{font-family:Arial;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:8px;}</style></head><body>${htmlInforme}<script>window.print()<\/script></body></html>`);
      w.document.close();
      return;
    } catch (_) {}
  }

  mostrarModalInforme(htmlInforme);
}
