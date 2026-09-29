/**
 * Ayudante que deja usar el programa sin internet (modo app).
 * Explicación simple: guarda una copia de la pantalla para abrirla aunque no haya wifi.
 * En iPhone y Android permite instalarla desde el navegador.
 */
const CACHE = "hse-colombia-v1";
const ARCHIVOS = ["./", "./index.html", "./styles.css", "./app.js", "./firebase-config.js", "./datos-ivc.js", "./manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  e.respondWith(fetch(e.request).then((r) => {
    const copia = r.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copia));
    return r;
  }).catch(() => caches.match(e.request).then((m) => m || caches.match("./index.html"))));
});
