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
import { CARPETAS_31, IVC_SQ01, IVC_BELLEZA, IVC_COLCHONES } from "./datos-ivc.js";

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
/** Aviso: se avisa 15 días antes, como pide la tarea. */
const DIAS_AVISO = 15;

/** Explicación simple: días que faltan para el vencimiento. */
function diasRestantes(f) { if (!f) return 9999; const h = new Date(); h.setHours(0, 0, 0, 0); return Math.ceil((new Date(f + "T00:00:00") - h) / 86400000); }
/** Explicación simple: color verde al día, amarillo vence en 15 días, rojo vencido. */
function estadoDoc(f) { const d = diasRestantes(f); if (d < 0) return { texto: "Vencido", clase: "vencido" }; if (d <= DIAS_AVISO) return { texto: `Por vencer (${d}d)`, clase: "por-vencer" }; return { texto: `Vigente (${d}d)`, clase: "vigente" }; }
function esSuperAdmin() { return usuarioActual && usuarioActual.email === SUPERADMIN_EMAIL; }
/** Explicación simple: lee un archivo foto/PDF/Word y lo vuelve texto para guardarlo. */
function leerArchivoComoTexto(file) { return new Promise((res, rej) => { if (!file) return res(null); if (file.size > 4 * 1024 * 1024) return rej(new Error("Archivo muy pesado (máx 4MB en modo prueba).")); const r = new FileReader(); r.onload = () => res({ nombre: file.name, tipo: file.type, datos: r.result }); r.onerror = rej; r.readAsDataURL(file); }); }

document.addEventListener("DOMContentLoaded", async () => {
  llenarTiposDoc(); conectarBotones(); pintarObligaciones("todas"); pintarCarpetas(""); pintarIVC("sq01"); pintarServicios(); armarChequeo();
  if (isFirebaseConfigured()) {
    try {
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
      const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
      const { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
      auth = getAuth(initializeApp(firebaseConfig)); db = getFirestore(auth.app ?? undefined) ?? getFirestore();
      proveedorGoogle = new GoogleAuthProvider();
      window._fb = { signInWithPopup, onAuthStateChanged, signOut, collection, addDoc, getDocs, deleteDoc, doc };
      modoNube = true;
      window._fb.onAuthStateChanged(auth, (u) => { if (u) entrar({ nombre: u.displayName, email: u.email, foto: u.photoURL, uid: u.uid }); else salirVista(); });
    } catch (e) { console.warn("Sigo en modo prueba.", e); }
  }
  const demo = memoria.leer("hse_demo_user", null);
  if (!modoNube && demo) entrar(demo, true);
});

function llenarTiposDoc() { document.getElementById("doc-tipo").innerHTML = TIPOS_DOC.map(t => `<option>${t}</option>`).join(""); }

function conectarBotones() {
  document.getElementById("btn-google").onclick = async () => {
    const m = document.getElementById("mensaje-login");
    if (!modoNube) { m.textContent = "Aún no hay llave Firebase. Use modo prueba o pegue la llave en firebase-config.js"; return; }
    try { await window._fb.signInWithPopup(auth, proveedorGoogle); } catch (e) { m.textContent = "No se pudo entrar: " + e.message; }
  };
  document.getElementById("btn-demo").onclick = () => entrar({ nombre: "Usuario prueba", email: "prueba@ejemplo.com", foto: "", uid: "demo" }, true);
  document.getElementById("btn-salir").onclick = async () => { if (modoNube && auth) await window._fb.signOut(auth); localStorage.removeItem("hse_demo_user"); salirVista(); };
  document.querySelectorAll("nav.tabs button").forEach(b => b.onclick = () => {
    document.querySelectorAll("nav.tabs button").forEach(x => x.classList.remove("activo")); b.classList.add("activo");
    ["empresas", "documentos", "auditoria", "obligaciones", "carpeta", "ivc", "servicios", "vencimientos", "admin"].forEach(t => document.getElementById("tab-" + t).classList.add("oculto"));
    document.getElementById("tab-" + b.dataset.tab).classList.remove("oculto");
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

function entrar(u, demo = false) {
  usuarioActual = u;
  if (demo && !modoNube) memoria.guardar("hse_demo_user", u);
  document.getElementById("pantalla-login").classList.add("oculto");
  document.getElementById("pantalla-app").classList.remove("oculto");
  document.getElementById("caja-usuario").classList.remove("oculto");
  document.getElementById("nombre-usuario").textContent = u.nombre || u.email;
  document.getElementById("rol-usuario").innerHTML = esSuperAdmin() ? "👑 Superadministrador" : "Usuario";
  document.getElementById("foto-usuario").src = u.foto || "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";
  if (esSuperAdmin()) document.getElementById("tab-admin").classList.remove("oculto");
  refrescarTodo();
}
function salirVista() { usuarioActual = null; document.getElementById("pantalla-login").classList.remove("oculto"); document.getElementById("pantalla-app").classList.add("oculto"); document.getElementById("caja-usuario").classList.add("oculto"); }

async function leerEmpresas() {
  if (modoNube) { const s = await window._fb.getDocs(window._fb.collection(db, "empresas")); let l = s.docs.map(d => ({ id: d.id, ...d.data() })); if (!esSuperAdmin()) l = l.filter(e => e.ownerUid === usuarioActual.uid || e.ownerEmail === usuarioActual.email); return l; }
  let l = memoria.leer("hse_empresas", []); if (!esSuperAdmin() && usuarioActual) l = l.filter(e => !e.ownerEmail || e.ownerEmail === usuarioActual.email); return l;
}
async function leerDocs() {
  if (modoNube) { const s = await window._fb.getDocs(window._fb.collection(db, "documentos")); let l = s.docs.map(d => ({ id: d.id, ...d.data() })); if (!esSuperAdmin()) l = l.filter(x => x.ownerUid === usuarioActual.uid || x.ownerEmail === usuarioActual.email); return l; }
  let l = memoria.leer("hse_docs", []); if (!esSuperAdmin() && usuarioActual) l = l.filter(x => !x.ownerEmail || x.ownerEmail === usuarioActual.email); return l;
}
async function guardarEmpresa() {
  const nombre = document.getElementById("emp-nombre").value.trim(), nit = document.getElementById("emp-nit").value.trim(), ciudad = document.getElementById("emp-ciudad").value.trim(), actividad = document.getElementById("emp-actividad").value;
  if (!nombre || !nit) return alert("Escriba razón social y NIT (para la auditoría).");
  const o = { nombre, nit, ciudad, actividad, ownerUid: usuarioActual.uid, ownerEmail: usuarioActual.email, creado: new Date().toISOString() };
  if (modoNube) await window._fb.addDoc(window._fb.collection(db, "empresas"), o);
  else { const l = memoria.leer("hse_empresas", []); o.id = "e" + Date.now(); l.push(o); memoria.guardar("hse_empresas", l); }
  document.getElementById("emp-nombre").value = ""; document.getElementById("emp-nit").value = ""; refrescarTodo();
}
/** Explicación simple: guarda el papel con su foto/PDF/Word y su vencimiento. */
async function guardarDoc() {
  try {
    const empresaId = document.getElementById("doc-empresa").value, tipo = document.getElementById("doc-tipo").value;
    const numero = document.getElementById("doc-numero").value.trim(), vence = document.getElementById("doc-vence").value, nota = document.getElementById("doc-nota").value.trim();
    const file = document.getElementById("doc-archivo").files[0];
    if (!empresaId) return alert("Primero cree una empresa.");
    if (!vence) return alert("Elija la fecha de vencimiento.");
    const empresas = await leerEmpresas(); const emp = empresas.find(e => (e.id || e.nombre) === empresaId);
    const arch = await leerArchivoComoTexto(file);
    const o = { empresaId, empresaNombre: emp ? emp.nombre : empresaId, empresaNit: emp ? emp.nit : "", tipo, numero, vence, nota, archivoNombre: arch?.nombre || "", archivoTipo: arch?.tipo || "", archivoDatos: arch?.datos || "", ownerUid: usuarioActual.uid, ownerEmail: usuarioActual.email, creado: new Date().toISOString() };
    if (modoNube) { const { archivoDatos, ...sinPesado } = o; await window._fb.addDoc(window._fb.collection(db, "documentos"), sinPesado); alert("Guardado en nube (el archivo pesado queda en este equipo en modo prueba)."); }
    else { const l = memoria.leer("hse_docs", []); o.id = "d" + Date.now(); l.push(o); memoria.guardar("hse_docs", l); }
    document.getElementById("doc-archivo").value = ""; refrescarTodo();
  } catch (e) { alert(e.message); }
}
async function borrar(col, id) {
  if (!confirm("¿Seguro quiere borrarlo?")) return;
  if (modoNube) await window._fb.deleteDoc(window._fb.doc(db, col, id));
  else memoria.guardar(col === "empresas" ? "hse_empresas" : "hse_docs", memoria.leer(col === "empresas" ? "hse_empresas" : "hse_docs", []).filter(x => x.id !== id));
  refrescarTodo();
}
window.borrar = borrar;

async function refrescarTodo() {
  const empresas = await leerEmpresas(), docs = await leerDocs();
  document.getElementById("lista-empresas").innerHTML = empresas.map(e => `<tr><td>${e.nombre}<br><small>NIT ${e.nit || "-"}</small></td><td>${e.nit || "-"}</td><td>${e.ciudad || "-"}</td><td>${e.actividad}</td><td><button class="peligro" onclick="borrar('empresas','${e.id}')">Borrar</button></td></tr>`).join("") || "<tr><td colspan=5>Cree la primera empresa con NIT y razón social.</td></tr>";
  const ops = empresas.map(e => `<option value="${e.id || e.nombre}">${e.nombre} - ${e.nit || "sin NIT"}</option>`).join("");
  document.getElementById("doc-empresa").innerHTML = ops; document.getElementById("aud-empresa").innerHTML = ops;
  await pintarDocs(); pintarVencimientos(docs, empresas); pintarAdmin(empresas, docs); pintarAuds();
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
/** Explicación simple: muestra los 5 servicios que se piden por WhatsApp. */
function pintarServicios() {
  document.getElementById("lista-servicios").innerHTML = SERVICIOS.map(s => `<div class="aviso">📋 <b>${s.n}</b>: ${s.d}<br><a href="https://wa.me/${WA_NUM}?text=${encodeURIComponent("Hola, necesito: " + s.n + " para mi negocio")}" target="_blank"><button> Pedir ${s.n}</button></a></div>`).join("") + `<div class="ok">También en <a href="https://saeing.com" target="_blank">saeing.com</a> y <a href="https://lottosst.com/" target="_blank">lottosst.com</a></div>`;
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
function pintarAdmin(empresas, docs) {
  const c = document.getElementById("panel-admin");
  if (!esSuperAdmin()) { c.innerHTML = "Solo gerencia@saeing.com puede ver esto."; return; }
  c.innerHTML = `<div class="ok">👑 Superadmin. Modo <b>${modoNube ? "Nube" : "Local"}</b>. Empresas ${empresas.length}, Docs ${docs.length}, Usuario ${usuarioActual.email}.</div><p style="font-size:13px">Despliegue: <code>firebase deploy</code>. Reglas en firestore.rules.</p>`;
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
  const empId = document.getElementById("aud-empresa").value; if (!empId) return alert("Cree una empresa primero.");
  const empresas = await leerEmpresas(); const emp = empresas.find(e => (e.id || e.nombre) === empId);
  const { nota, concepto } = calcularNota();
  const o = { empresaId: empId, empresaNombre: emp.nombre, empresaNit: emp.nit, tipo: document.getElementById("aud-tipo").value, acta: document.getElementById("aud-acta").value, auditor: document.getElementById("aud-nombre").value, auditorDoc: document.getElementById("aud-doc").value, propietario: document.getElementById("aud-prop").value, nota, concepto, firmaAud: document.getElementById("firma-aud").toDataURL(), firmaProp: document.getElementById("firma-prop").toDataURL(), por: usuarioActual.email, fecha: new Date().toISOString() };
  if (modoNube) await window._fb.addDoc(window._fb.collection(db, "auditorias"), o);
  else { const l = memoria.leer("hse_auds", []); o.id = "a" + Date.now(); l.push(o); memoria.guardar("hse_auds", l); }
  alert(`Auditoría guardada: ${nota}% ${concepto}`); pintarAuds();
}
async function leerAuds() { if (modoNube) { try { const s = await window._fb.getDocs(window._fb.collection(db, "auditorias")); return s.docs.map(d => ({ id: d.id, ...d.data() })); } catch { return memoria.leer("hse_auds", []); } } return memoria.leer("hse_auds", []); }
async function pintarAuds() {
  const l = await leerAuds();
  document.getElementById("lista-auds").innerHTML = l.slice(-5).reverse().map(a => `<div class="ok">🔍 ${a.fecha.slice(0, 10)} · ${a.empresaNombre} (${a.empresaNit}) · ${a.tipo} · <b>${a.nota}% ${a.concepto}</b> · Auditor ${a.auditor}</div>`).join("");
}
/** Explicación simple: abre el informe bonito para guardar en PDF con firmas y datos. */
async function informePDF() {
  const empId = document.getElementById("aud-empresa").value; const empresas = await leerEmpresas(); const emp = empresas.find(e => (e.id || e.nombre) === empId);
  if (!emp) return alert("Elija empresa.");
  const { nota, concepto } = calcularNota();
  const items = itemsAuditoria().map(it => { const v = document.querySelector(`input[name=aud${it.id}]:checked`)?.value; return `<tr><td>${it.id + 1}</td><td>${it.texto}</td><td>${v === "cumple" ? "Cumple" : v === "nocumple" ? "No cumple" : "N/A"}</td></tr>`; }).join("");
  const w = window.open("", "_blank");
  w.document.write(`<html><head><meta charset='utf-8'><title>Informe auditoría ${emp.nombre}</title></head><body style="font-family:Arial"><h2>Informe de auditoría higiénico-sanitaria (tipo IVC)</h2><p><b>Razón social:</b> ${emp.nombre} <b>NIT:</b> ${emp.nit} <b>Ciudad:</b> ${emp.ciudad || ""}</p><p><b>Tipo:</b> ${document.getElementById("aud-tipo").value} <b>Acta base:</b> ${document.getElementById("aud-acta").value} <b>Fecha:</b> ${new Date().toLocaleString()}</p><p><b>Auditor:</b> ${document.getElementById("aud-nombre").value} (${document.getElementById("aud-doc").value}) <b>Propietario:</b> ${document.getElementById("aud-prop").value}</p><h3>Nota ponderada: ${nota}% — ${concepto}</h3><table border=1 cellpadding=6 cellspacing=0><tr><th>#</th><th>Aspecto verificado</th><th>Calificación</th></tr>${items}</table><div style="display:flex;gap:40px;margin-top:20px"><div><p>Firma auditor<br><img src="${document.getElementById("firma-aud").toDataURL()}" width=250><br>${document.getElementById("aud-nombre").value}</p></div><div><p>Firma propietario<br><img src="${document.getElementById("firma-prop").toDataURL()}" width=250><br>${document.getElementById("aud-prop").value}</p></div></div><p>Generado por Asistente HSE Colombia · ${usuarioActual.email} · Para PDF: Ctrl+P > Guardar como PDF</p><script>window.print()<\/script></body></html>`);
}
