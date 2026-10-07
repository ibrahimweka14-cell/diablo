/* =========================================================
   DIABLO PWA SERVICE WORKER
========================================================= */

const CACHE_NAME = "diablo-pwa-v1";

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

    /*
       الـPOST requests زي Diablo AI
       لازم تفضل تروح للشبكة.
    */

    if (request.method !== "GET") {
        return;
    }


    /*
       طلبات خارج موقع DIABLO
       نسيبها تشتغل من الشبكة مباشرة.
    */

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }


    /*
       صفحات الموقع:
       Network First
       ولو النت مش موجود استخدم النسخة المخزنة.
    */

    if (request.mode === "navigate") {

        event.respondWith(

            fetch(request)

                .then(response => {

                    const copy =
                        response.clone();

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


    /*
       ملفات الموقع:
       Cache First
    */

    event.respondWith(

        caches.match(request)

            .then(cachedResponse => {

                if (cachedResponse) {
                    return cachedResponse;
                }


                return fetch(request)

                    .then(response => {

                        if (
                            !response ||
                            response.status !== 200
                        ) {
                            return response;
                        }


                        const copy =
                            response.clone();


                        caches
                            .open(CACHE_NAME)
                            .then(cache => {

                                cache.put(
                                    request,
                                    copy
                                );

                            });


                        return response;

                    });

            })

    );

});