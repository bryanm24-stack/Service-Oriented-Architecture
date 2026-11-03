"use strict";
const CACHE_NAME = "projectsoa-pwa-shell-v1";
const STATIC_ASSETS = [
    "/offline.html",
    "/assets/app.v1.css",
    "/assets/app.v1.js",
    "/icons/icon.svg",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/icon-maskable-512.png",
    "/icons/apple-touch-icon.png",
];
const STATIC_PATHS = new Set(STATIC_ASSETS);
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting()),
    );
});
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((names) =>
                Promise.all(
                    names
                        .filter(
                            (name) =>
                                name.startsWith("projectsoa-pwa-shell-") &&
                                name !== CACHE_NAME,
                        )
                        .map((name) => caches.delete(name)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});
self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== "GET" || url.origin !== self.location.origin) return;
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(() =>
                caches
                    .open(CACHE_NAME)
                    .then((cache) => cache.match("/offline.html")),
            ),
        );
        return;
    }
    if (STATIC_PATHS.has(url.pathname) && !url.search) {
        event.respondWith(
            caches
                .open(CACHE_NAME)
                .then((cache) => cache.match(request))
                .then((cached) => cached || fetch(request)),
        );
    }
    // API, HTML, POST/PATCH/DELETE, tokens and financial responses are never cached.
});
