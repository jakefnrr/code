/**
 * shared/cloud-sync.js — drop-in forever-storage for EVERY page.
 *
 * Add these 2 lines near the top of <head> (before your app script):
 *   <script src="/shared/cloud-store.js"></script>
 *   <script src="/shared/cloud-sync.js" data-app="notes" data-keys="jakeNotes"></script>
 *
 * What happens:
 *  - On load: pulls shared value from Cloudflare, seeds cloud from local if empty.
 *  - On change: any localStorage.setItem for those keys auto-pushes to cloud (debounced).
 *  - Offline / file:// : silently keeps local-only, syncs later when hosted.
 *  - Room support: ?room=name in URL gives separate shared space per room.
 *    Omit ?room= for the global shared space.
 *
 * For big apps (Notes, GrindHub) prefer the foreground pattern instead:
 *   const store = CloudStore.forRoom("notes");
 *   const data = await store.load(fallback);
 * See Notes/index.html for the full example.
 */
(function () {
  if (!window.CloudStore) {
    console.warn("[cloud-sync] cloud-store.js missing — running local-only");
    return;
  }

  function getAttrs() {
    const el = document.currentScript || document.querySelector('script[src*="cloud-sync.js"]');
    const app = (el && el.getAttribute("data-app")) || "shared";
    const keysRaw = (el && el.getAttribute("data-keys")) || "";
    const keys = keysRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return { app, keys };
  }

  const { app, keys } = getAttrs();
  if (!keys.length) return;

  if (window.location.protocol === "file:") return; // local-only on file://

  const room = CloudStore.roomFromURL();
  const stores = {};
  keys.forEach((k) => {
    stores[k] = CloudStore.forRoom(app + "__" + k, room);
    // NOTE: forRoom builds key as "<app__key>:room:<room>"
  });

  function readLocal(k) {
    try {
      const raw = localStorage.getItem(k);
      if (raw === null) return undefined;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch {
      return undefined;
    }
  }

  function writeLocal(k, v) {
    try {
      localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    } catch {}
  }

  // 1) Initial pull: cloud wins if present, else seed cloud from local.
  keys.forEach(async (k) => {
    const store = stores[k];
    try {
      const cloudVal = await store.load(undefined);
      if (cloudVal !== undefined) {
        writeLocal(k, cloudVal);
        window.dispatchEvent(
          new CustomEvent("cloud-sync", { detail: { key: k, source: "cloud" } })
        );
      } else {
        const localVal = readLocal(k);
        if (localVal !== undefined) await store.save(localVal);
      }
    } catch (e) {
      console.warn("[cloud-sync] init failed for", k, e.message);
    }
  });

  // 2) Push on change: patch setItem/removeItem (debounced per key).
  const timers = {};
  const origSet = Storage.prototype.setItem;
  const origRemove = Storage.prototype.removeItem;

  Storage.prototype.setItem = function (key, value) {
    origSet.call(this, key, value);
    if (this !== window.localStorage) return;
    if (!stores[key]) return;
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => {
      let parsed = value;
      try {
        parsed = JSON.parse(value);
      } catch {}
      stores[key].save(parsed);
    }, 800);
  };

  Storage.prototype.removeItem = function (key) {
    origRemove.call(this, key);
    if (this !== window.localStorage) return;
    if (!stores[key]) return;
    stores[key].save(null);
  };

  // 3) Cross-tab + periodic re-pull (shared rooms stay fresh).
  window.addEventListener("storage", (e) => {
    if (e.key && stores[e.key]) {
      clearTimeout(timers[e.key + ":pull"]);
      timers[e.key + ":pull"] = setTimeout(async () => {
        const v = await stores[e.key].load(undefined);
        if (v !== undefined) {
          writeLocal(e.key, v);
          window.dispatchEvent(
            new CustomEvent("cloud-sync", { detail: { key: e.key, source: "peer" } })
          );
        }
      }, 500);
    }
  });

  setInterval(async () => {
    for (const k of keys) {
      try {
        const v = await stores[k].load(undefined);
        if (v !== undefined) {
          const cur = readLocal(k);
          const a = JSON.stringify(cur);
          const b = JSON.stringify(v);
          if (a !== b) {
            writeLocal(k, v);
            window.dispatchEvent(
              new CustomEvent("cloud-sync", { detail: { key: k, source: "poll" } })
            );
          }
        }
      } catch {}
    }
  }, 15000);
})();
