// Estratégia "rede primeiro, cache como reserva": toda vez que há
// internet, busca a versão mais nova e atualiza o cache — então o app
// continua se atualizando sozinho normalmente. Só usa a cópia
// guardada quando a rede falha de verdade (offline), pra o app
// instalado continuar abrindo sem internet.
const CACHE_VERSION = "v1";
const CACHE_NAME = "gibabit-shell-" + CACHE_VERSION;

const SHELL_ASSETS = [
    "index.html",
    "style.css",
    "script.js",
    "manifest.json",
    "manifest-aluno.json",
    "images/logo.png",
    "images/icon-192.png",
    "images/icon-512.png",
    "images/icon-180.png",
    "https://cdnjs.cloudflare.com/ajax/libs/firebase/10.12.2/firebase-app-compat.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/firebase/10.12.2/firebase-firestore-compat.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/firebase/10.12.2/firebase-auth-compat.min.js"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(SHELL_ASSETS))
            .catch((e) => console.error("Falha ao pré-cachear o app shell:", e))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                return response;
            })
            .catch(() => caches.match(event.request).then((cached) => cached || caches.match("index.html")))
    );
});
