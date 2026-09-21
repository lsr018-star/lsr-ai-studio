/* ============================================================
   LSR AI STUDIO — js/state.js
   Central store: conversations, code-lab files, schedules,
   studio sites, settings (incl. per-provider AI configs).
   Persisted to localStorage (debounced).
   ============================================================ */
(function () {
  "use strict";

  var STORE_KEY = "lsr-ai-studio-v1";

  function uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + "_" +
      Math.random().toString(36).slice(2, 8);
  }

  /* ---------- AI provider catalog (pure, testable) ---------- */
  function providerCatalog() {
    return [
      {
        id: "pollinations", name: "Pollinations Free", tag: "FREE · no key needed",
        base: "https://text.pollinations.ai/openai", model: "openai-fast", needsKey: false,
        blurb: "Completely free — no account, no API key. OpenAI-compatible chat endpoint served by Pollinations."
      },
      {
        id: "openrouter", name: "OpenRouter", tag: "Free API key",
        base: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.3-70b-instruct:free", needsKey: true,
        blurb: "Free API key from openrouter.ai. Models whose id ends in :free cost nothing."
      },
      {
        id: "gemini", name: "Google Gemini", tag: "Free API key",
        base: "https://generativelanguage.googleapis.com/v1beta/openai/", model: "gemini-2.0-flash", needsKey: true,
        blurb: "Google's OpenAI-compatible endpoint. Generous free tier with a free key from Google AI Studio."
      },
      {
        id: "groq", name: "Groq", tag: "Free API key",
        base: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", needsKey: true,
        blurb: "Extremely fast inference. Free tier with a free key from console.groq.com."
      },
      {
        id: "custom", name: "Custom OpenAI-compatible", tag: "Your own server",
        base: "", model: "", needsKey: true,
        blurb: "Point at anything OpenAI-compatible: vLLM, Ollama, LiteLLM, LM Studio, NVIDIA NIM — or your own self-hosted LiteLLM gateway."
      }
    ];
  }

  function defaultProviders() {
    var out = {};
    providerCatalog().forEach(function (p) {
      out[p.id] = { base: p.base, model: p.model, key: "" };
    });
    return out;
  }

  function defaultSettings() {
    return {
      providerId: "pollinations",
      providers: defaultProviders(),
      accent: "cyan",
      bgAnimation: true,
      activeModel: "demo" // "demo" | "live"
    };
  }

  /* Migrate pre-provider settings (flat apiBase/apiKey/model) into
     the Custom provider slot. Pure — safe to unit test. */
  function migrateLegacySettings(s) {
    s = s || {};
    if (!s.providerId && (s.apiBase || s.apiKey || s.model)) {
      s.providerId = "custom";
      s.providers = s.providers || {};
      s.providers.custom = {
        base: s.apiBase || "",
        key: s.apiKey || "",
        model: s.model || ""
      };
    }
    delete s.apiBase;
    delete s.apiKey;
    delete s.model;
    return s;
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

  function defaultSites() {
    return { templateId: "business", configs: {} };
  }

  function defaultState() {
    return {
      conversations: [],
      activeConvId: null,
      files: defaultFiles(),
      activeFileId: null,
      schedules: [],
      sites: defaultSites(),
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
          state.settings = Object.assign(
            defaultSettings(),
            migrateLegacySettings(parsed.settings || {})
          );
          // Fill any provider slots missing from older saves
          state.settings.providers = Object.assign(
            defaultProviders(),
            state.settings.providers || {}
          );
          if (parsed.sites && typeof parsed.sites === "object") {
            state.sites = {
              templateId: parsed.sites.templateId || "business",
              configs: parsed.sites.configs && typeof parsed.sites.configs === "object"
                ? parsed.sites.configs : {}
            };
          }
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
  // Flush pending saves when the page is hidden/closed, so a fast
  // tab close never loses the last change.
  function flush() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    saveNow();
  }
  try {
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flush();
    });
  } catch (e) {}

  function exportData() {
    return JSON.stringify({
      app: "lsr-ai-studio",
      version: 2,
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
    if (data.settings) {
      next.settings = Object.assign(defaultSettings(), migrateLegacySettings(data.settings));
      next.settings.providers = Object.assign(defaultProviders(), next.settings.providers || {});
    }
    if (data.sites && typeof data.sites === "object") {
      next.sites = {
        templateId: data.sites.templateId || "business",
        configs: data.sites.configs || {}
      };
    }
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
  LSR.PROVIDERS = providerCatalog();
  LSR.providerCatalog = providerCatalog;
  LSR.defaultProviders = defaultProviders;
  LSR.migrateLegacySettings = migrateLegacySettings;
})();
