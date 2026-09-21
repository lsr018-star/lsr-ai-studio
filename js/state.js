/* ============================================================
   LSR AI STUDIO — js/state.js
   Central store: conversations, code-lab files, schedules,
   settings. Persisted to localStorage (debounced).
   ============================================================ */
(function () {
  "use strict";

  var STORE_KEY = "lsr-ai-studio-v1";

  function uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + "_" +
      Math.random().toString(36).slice(2, 8);
  }

  function defaultSettings() {
    return {
      apiBase: "",
      apiKey: "",
      model: "",
      accent: "cyan",
      bgAnimation: true,
      activeModel: "demo" // "demo" | "live"
    };
  }

  function defaultFiles() {
    return [{
      id: uid("file"),
      name: "hello.js",
      lang: "javascript",
      content:
`// Welcome to Code Lab — press Run ▶
const greeting = "Hello from LSR AI Studio";
const models = ["Qwen3-Coder-Next", "DeepSeek-V3", "Kimi K3"];

for (const m of models) {
  console.log(greeting + " · " + m);
}

function fibonacci(n) {
  return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
}
console.log("fib(10) =", fibonacci(10));`
    }];
  }

  function defaultState() {
    return {
      conversations: [],
      activeConvId: null,
      files: defaultFiles(),
      activeFileId: null,
      schedules: [],
      settings: defaultSettings()
    };
  }

  function load() {
    var state = defaultState();
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          state.conversations = Array.isArray(parsed.conversations) ? parsed.conversations : [];
          state.activeConvId = parsed.activeConvId || null;
          state.files = Array.isArray(parsed.files) && parsed.files.length ? parsed.files : defaultFiles();
          state.activeFileId = parsed.activeFileId || (state.files[0] && state.files[0].id) || null;
          state.schedules = Array.isArray(parsed.schedules) ? parsed.schedules : [];
          state.settings = Object.assign(defaultSettings(), parsed.settings || {});
        }
      }
    } catch (e) { /* corrupted storage -> start fresh */ }
    if (!state.activeFileId && state.files.length) state.activeFileId = state.files[0].id;
    return state;
  }

  var saveTimer = null;
  function saveNow() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(LSR.state));
    } catch (e) { /* quota / private mode */ }
  }
  function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 250);
  }

  function exportData() {
    return JSON.stringify({
      app: "lsr-ai-studio",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: LSR.state
    }, null, 2);
  }

  function importData(jsonText) {
    var parsed = JSON.parse(jsonText);
    var data = parsed && parsed.data ? parsed.data : parsed;
    if (!data || typeof data !== "object") throw new Error("Not a valid export file.");
    var next = defaultState();
    if (Array.isArray(data.conversations)) next.conversations = data.conversations;
    if (Array.isArray(data.files) && data.files.length) next.files = data.files;
    if (Array.isArray(data.schedules)) next.schedules = data.schedules;
    if (data.settings) next.settings = Object.assign(defaultSettings(), data.settings);
    next.activeConvId = data.activeConvId || null;
    next.activeFileId = data.activeFileId || (next.files[0] && next.files[0].id) || null;
    LSR.state = next;
    saveNow();
  }

  function clearAll() {
    try { window.localStorage.removeItem(STORE_KEY); } catch (e) {}
    LSR.state = defaultState();
  }

  /* Tiny pub/sub so modules can react to state changes */
  var listeners = {};
  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
  }
  function emit(evt, payload) {
    (listeners[evt] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error(e); }
    });
  }

  window.LSR = window.LSR || {};
  LSR.state = load();
  LSR.uid = uid;
  LSR.save = save;
  LSR.saveNow = saveNow;
  LSR.exportData = exportData;
  LSR.importData = importData;
  LSR.clearAll = clearAll;
  LSR.on = on;
  LSR.emit = emit;
  LSR.STORE_KEY = STORE_KEY;
})();
