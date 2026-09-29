/**
 * shared/cloud-store.js
 * One tiny lib used by EVERY page for forever-storage.
 *
 * What it does:
 *  - Tries Cloudflare `/api/shared?key=...` first (shared for everyone)
 *  - Always mirrors to localStorage too (works offline + on file://)
 *  - On file:// it ONLY uses localStorage (browsers block fetch there)
 *
 * Usage in any HTML file (3 lines):
 *   <script src="../shared/cloud-store.js"></script>
 *   <script>
 *     const store = CloudStore.forRoom("notes", "lobby");
 *     const data = await store.load(fallbackValue);
 *     await store.save(data);
 *   </script>
 *
 * Key format forever: "<app>:room:<room>" e.g. "notes:room:lobby"
 */

(function (global) {
  const API_PATH = "/api/shared";

  function isFileProto() {
    try {
      return window.location.protocol === "file:";
    } catch {
      return false;
    }
  }

  function canUseCloud() {
    if (isFileProto()) return false;
    // http://localhost and https://jakescalzo.me can both use cloud
    return true;
  }

  function sanitizeRoom(room) {
    return String(room || "global")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, "-")
      .slice(0, 48) || "global";
  }

  function roomFromURL() {
    try {
      const u = new URL(window.location.href);
      return sanitizeRoom(u.searchParams.get("room") || "global");
    } catch {
      return "global";
    }
  }

  async function apiGet(key) {
    const res = await fetch(API_PATH + "?key=" + encodeURIComponent(key), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || ("GET failed: " + res.status));
    }
    const data = await res.json();
    return data.value;
  }

  async function apiSet(key, value) {
    const res = await fetch(API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || ("POST failed: " + res.status));
    }
    return res.json().catch(() => ({ ok: true }));
  }

  function forRoom(app, room) {
    const roomName = sanitizeRoom(room || roomFromURL());
    const key = app + ":room:" + roomName;
    const localKey = "cloud:" + key;

    let cloudOk = null; // null = unknown, true/false after first try

    async function load(fallbackValue) {
      // 1) Try cloud (unless file://)
      if (canUseCloud()) {
        try {
          const v = await apiGet(key);
          cloudOk = true;
          if (v !== null && v !== undefined) {
            try {
              localStorage.setItem(localKey, JSON.stringify(v));
            } catch {}
            return v;
          }
        } catch (e) {
          cloudOk = false;
          console.warn("[CloudStore] cloud load failed, using local:", e.message);
        }
      }
      // 2) Local mirror
      try {
        const raw = localStorage.getItem(localKey);
        if (raw !== null) return JSON.parse(raw);
      } catch {}
      // 3) Legacy key fallback (e.g. old "jakeNotes") — caller passes it
      return fallbackValue;
    }

    let saveTimer = null;
    let pendingValue = null;

    function saveNow(value) {
      pendingValue = value;
      // always write local immediately
      try {
        localStorage.setItem(localKey, JSON.stringify(value));
      } catch {}
      if (!canUseCloud()) return Promise.resolve({ local: true });
      return apiSet(key, value)
        .then((r) => {
          cloudOk = true;
          return r;
        })
        .catch((e) => {
          cloudOk = false;
          console.warn("[CloudStore] cloud save failed, kept locally:", e.message);
          return { local: true, error: e.message };
        });
    }

    function saveDebounced(value, ms = 600) {
      pendingValue = value;
      try {
        localStorage.setItem(localKey, JSON.stringify(value));
      } catch {}
      if (!canUseCloud()) return Promise.resolve({ local: true });
      clearTimeout(saveTimer);
      return new Promise((resolve) => {
        saveTimer = setTimeout(() => {
          apiSet(key, pendingValue).then(
            (r) => {
              cloudOk = true;
              resolve(r);
            },
            (e) => {
              cloudOk = false;
              resolve({ local: true, error: e.message });
            }
          );
        }, ms);
      });
    }

    function status() {
      if (isFileProto()) return "local-only (file:// — open via jakescalzo.me to sync)";
      if (cloudOk === true) return "cloud-synced";
      if (cloudOk === false) return "local-fallback (cloud not configured yet)";
      return "local + cloud-ready";
    }

    return { key, room: roomName, load, save: saveNow, saveDebounced, status, isFileProto };
  }

  global.CloudStore = { forRoom, roomFromURL, sanitizeRoom, canUseCloud };
})(window);
