/* =========================================================
   DIABLO PWA SERVICE WORKER
========================================================= */

const CACHE_NAME = "diablo-pwa-v2";

const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json",
    "./diablo-hero.png"
];


/* =========================================================
   INSTALL
========================================================= */

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)

            .then(cache => {

                return cache.addAll(APP_FILES);

            })

    );

    self.skipWaiting();

});


/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys().then(keys => {

            return Promise.all(

                keys

                    .filter(key => key !== CACHE_NAME)

                    .map(key => caches.delete(key))

            );

        })

    );

    self.clients.claim();

});


/* =========================================================
   FETCH
========================================================= */

self.addEventListener("fetch", event => {

    const request = event.request;

    /* =========================
       POST REQUESTS
       Diablo AI وغيرها
    ========================= */

    if (request.method !== "GET") {
        return;
    }


    /* =========================
       EXTERNAL REQUESTS
    ========================= */

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }


    /* =========================
       HTML PAGES
       NETWORK FIRST
    ========================= */

    if (request.mode === "navigate") {

        event.respondWith(

            fetch(request)

                .then(response => {

                    const copy = response.clone();

                    caches
                        .open(CACHE_NAME)
                        .then(cache => {

                            cache.put(
                                request,
                                copy
                            );

                        });

                    return response;

                })

                .catch(() => {

                    return caches.match(
                        "./index.html"
                    );

                })

        );

        return;
    }


    /* =========================
       CSS / JS / IMAGES
       NETWORK FIRST
       
       مهم جدًا:
       كل Refresh هيحاول يجيب
       النسخة الجديدة الأول.
    ========================= */

    event.respondWith(

        fetch(request)

            .then(response => {

                if (
                    !response ||
                    response.status !== 200
                ) {
                    return response;
                }

                const copy = response.clone();

                caches
                    .open(CACHE_NAME)
                    .then(cache => {

                        cache.put(
                            request,
                            copy
                        );

                    });

                return response;

            })

            .catch(() => {

                return caches.match(request);

            })

    );

});
