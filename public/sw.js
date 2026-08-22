// Runway OS service worker — stale-while-revalidate for static assets only.
// Bump this on any precache-list change to invalidate the old cache.
const CACHE_NAME = "runway-os-v1";

const PRECACHE_URLS = [
  "/",
  "/app",
  "/index.html",
  "/app-icon.png",
  "/manifest.json",
  "/fonts/Geist-Variable.woff2",
  "/fonts/GeistMono-Variable.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isBypassed(url) {
  return url.pathname.startsWith("/api/") || url.hostname.includes("stripe.com");
}

const SHARE_CACHE = "runway-os-share-v1";

// Web Share Target: the OS share sheet POSTs here (image + optional
// title/text). Stash the payload in Cache Storage — the only storage the SW
// and the client tab can both reach synchronously — then redirect into the
// app, which picks it up and clears it on the way through ReceiptDropzone.
async function handleShareTarget(request) {
  const formData = await request.formData();
  const file = formData.get("media");
  const text = formData.get("text");
  const title = formData.get("title");

  const cache = await caches.open(SHARE_CACHE);
  if (file instanceof File && file.size > 0) {
    await cache.put("/__shared-file", new Response(file, { headers: { "Content-Type": file.type } }));
  }
  const combinedText = [title, text].filter(Boolean).join(" ").trim();
  if (combinedText) {
    await cache.put("/__shared-text", new Response(combinedText));
  }

  return Response.redirect("/app?action=share", 303);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const shareUrl = new URL(request.url);
  if (request.method === "POST" && shareUrl.pathname === "/share-target") {
    event.respondWith(handleShareTarget(request));
    return;
  }
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin && !url.hostname.includes("stripe.com")) {
    // Allow other cross-origin requests (fonts CDNs, etc.) to pass through
    // untouched rather than trying to cache them.
    return;
  }
  if (isBypassed(url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    }),
  );
});
