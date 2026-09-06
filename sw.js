// Service worker mínimo — só existe pra tornar o site instalável como
// PWA (Chrome/Android exige um). Não guarda cache de propósito: como
// esse é um painel escolar que muda com frequência (admin cadastra e
// edita apps o tempo todo), cachear aqui reintroduziria o mesmo tipo
// de "por que minha atualização não aparece" que já corrigimos nos
// headers do Firebase Hosting.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
    event.respondWith(fetch(event.request));
});
