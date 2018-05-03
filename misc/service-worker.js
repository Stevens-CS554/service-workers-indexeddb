// We can invalidate our cache entries by simply renaming the version later
const ASSET_CACHE = "assets-v3";
const RESULT_CACHE = "runtime-v3";

// A list of local resources we always want to be cached.
const ASSET_URLS = [
  "/home", // we can cache our actual page
  "/assets/js/jquery.min.js",
  "/assets/js/idb.js",
  "/assets/js/bootstrap.js",
  "/assets/css/bootstrap.css",
  "/assets/js/main.js"
];

const getDb = new Promise((resolve, reject) => {
  const dbRequest = indexedDB.open("todo-store");

  dbRequest.onupgradeneeded = function(event) {
    const db = event.target.result;
    const objectStore = db.createObjectStore("Entries", { keyPath: "id" });
  };

  dbRequest.onsuccess = function(evt) {
    resolve(evt.target.result);
  };
});

const addEntry = async entry => {
  const db = await getDb;

  const transaction = db.transaction(["Entries"], "readwrite");
  const entryStore = transaction.objectStore("Entries");

  const addRequest = entryStore.add(entry);
  addRequest.onsuccess = function(event) {
    // event.target.result === customer.ssn;
  };
};

const helpers = {
  uuid() {
    let uuid = "",
      i,
      random;
    for (i = 0; i < 32; i++) {
      random = (Math.random() * 16) | 0;

      if (i == 8 || i == 12 || i == 16 || i == 20) {
        uuid += "-";
      }
      uuid += (i == 12 ? 4 : i == 16 ? (random & 3) | 8 : random).toString(16);
    }
    return uuid;
  }
};

const APP_URLS = ["/to-do"];

// The install handler takes care of precaching the resources we always need.
self.addEventListener("install", event => {
  console.log("installing service worker");
  const downloadAssets = async () => {
    const assetCache = await caches.open(ASSET_CACHE);
    const keys = await assetCache.keys();

    await assetCache.addAll(ASSET_URLS);

    return self.skipWaiting();
  };

  event.waitUntil(downloadAssets().catch(console.log));
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener("activate", event => {
  console.log("activating service worker");
  // This deletes the old caches
  const currentCaches = [ASSET_CACHE, RESULT_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return cacheNames.filter(
          cacheName => !currentCaches.includes(cacheName)
        );
      })
      .then(cachesToDelete => {
        return Promise.all(
          cachesToDelete.map(cacheToDelete => {
            return caches.delete(cacheToDelete);
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// The fetch handler serves responses for same-origin resources from a cache.
// If no response is found, it populates the runtime cache with the response
// from the network before returning it to the page.
self.addEventListener("fetch", event => {
  // Skip cross-origin requests, like those for Google Analytics.
  if (event.request.url.startsWith(self.location.origin)) {
    const doWork = async () => {
      const requestUrl = event.request.url;
      const requestMethod = event.request.method;

      const assetCache = await caches.open(ASSET_CACHE);
      const assetMatch = await assetCache.match(event.request);

      if (assetMatch) {
        return assetMatch;
      }

      const isAppUrl = APP_URLS.find(url => requestUrl.endsWith(url));
      const isGet = requestMethod === "GET";

      if (isAppUrl && requestMethod === "GET") {
        // this is an app URL; try to fetch, and then try to cache if that fails"

        const appCache = await caches.open(RESULT_CACHE);

        try {
          // Fetching the normal URL, and caching it
          const response = await fetch(event.request);
          await appCache.put(event.request, response.clone());

          return response;
        } catch (e) {
          // If fetch failed, we check our cache
          const appMatch = await appCache.match(event.request);
          if (appMatch) return appMatch;

          return new Response("", { status: 404 });
        }
      }

      if (requestUrl.endsWith("/to-do") && !isGet) {
        // This time, we try a fetch. If there's nothing to fetch, we go to IndexedDB
        try {
          // We clone, for the purpose of not consuming the real request so we can use it if this fails
          const fetchAttempt = event.request.clone();
          const response = await fetch(fetchAttempt);
          return response;
        } catch (e) {
          // no-op, we'll just do our logic below the catch
          // console.log(e);
        }

        // We couldn't POST to server, so what we want to do is write this to IndexedDB
        const body = await event.request.json();
        body.todo.id = helpers.uuid();

        try {
          await addEntry(body.todo);
          // We can now add logic that processes these uploads at a later point in time
        } catch (e) {
          console.log(e);
        }

        return new Response(JSON.stringify(body.todo), { status: 200 });
      }

      return fetch(event.request);
    };

    event.respondWith(doWork());
  }
});
