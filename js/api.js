/* ============================================================
   LSR AI STUDIO — js/api.js
   Provider-aware backend: OpenAI-compatible /chat/completions
   streaming via fetch + ReadableStream SSE parsing.
   LSR.api.complete is the single router that picks Demo vs
   Live for every feature. Pure helpers (buildChatRequest,
   parseSSEData) are exposed for unit tests.
   ============================================================ */
(function () {
  "use strict";

  function joinUrl(base, path) {
    return String(base).replace(/\/+$/, "") + path;
  }

  function getProvider(id) {
    var list = LSR.PROVIDERS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return list[0];
  }

  /* Effective config for a provider: stored overrides merged over
     catalog defaults. Pure given (LSR.PROVIDERS, stored). */
  function providerConfig(id) {
    var p = getProvider(id);
    var stored = (LSR.state.settings.providers || {})[p.id] || {};
    return {
      id: p.id,
      name: p.name,
      tag: p.tag,
      blurb: p.blurb,
      needsKey: !!p.needsKey,
      base: stored.base !== undefined ? stored.base : p.base,
      model: stored.model !== undefined ? stored.model : p.model,
      key: stored.key || ""
    };
  }

  function activeProvider() {
    return providerConfig(LSR.state.settings.providerId || "pollinations");
  }

  /* Pure: build the fetch params for a chat completion request.
     Authorization header is only attached when a key exists, so
     keyless free providers (Pollinations) work. */
  function buildChatRequest(cfg, messages, stream) {
    var headers = { "Content-Type": "application/json" };
    if (cfg.key) headers["Authorization"] = "Bearer " + cfg.key;
    return {
      url: joinUrl(cfg.base, "/chat/completions"),
      headers: headers,
      body: {
        model: cfg.model,
        stream: !!stream,
        messages: messages
      }
    };
  }

  /* Pure: parse one SSE "data:" payload into a text delta.
     Returns "" for [DONE], malformed lines, or non-content events. */
  function parseSSEData(data) {
    if (data === "[DONE]") return "";
    try {
      var json = JSON.parse(data);
      var delta = json.choices && json.choices[0] && json.choices[0].delta;
      var content = delta && delta.content ? delta.content : "";
      return typeof content === "string" ? content : "";
    } catch (e) {
      return "";
    }
  }

  /* Stream chat completions. onToken receives text deltas.
     Resolves with the full text. Rejects on HTTP/network error. */
  async function streamChat(opts) {
    var req = buildChatRequest(opts.provider, opts.messages, true);
    var ctrl = opts.signal ? null : new AbortController();
    var signal = opts.signal || ctrl.signal;

    var res = await fetch(req.url, {
      method: "POST",
      signal: signal,
      headers: req.headers,
      body: JSON.stringify(req.body)
    });

    if (!res.ok) {
      var detail = "";
      try { detail = await res.text(); } catch (e) {}
      throw new Error("API error " + res.status + (detail ? ": " + detail.slice(0, 220) : ""));
    }

    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buf = "";
    var full = "";

    while (true) {
      var step = await reader.read();
      if (step.done) break;
      buf += decoder.decode(step.value, { stream: true });
      var parts = buf.split("\n");
      buf = parts.pop();
      for (var i = 0; i < parts.length; i++) {
        var line = parts[i].trim();
        if (!line || line.indexOf("data:") !== 0) continue;
        var content = parseSSEData(line.slice(5).trim());
        if (content) { full += content; if (opts.onToken) opts.onToken(content); }
      }
    }
    return full;
  }

  /* Quick non-streaming probe used by "Test connection". */
  async function testConnection(cfg) {
    var req = buildChatRequest(cfg, [{ role: "user", content: "Reply with the single word: ok" }], false);
    req.body.max_tokens = 8;
    var res = await fetch(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(req.body)
    });
    if (!res.ok) {
      var detail = "";
      try { detail = await res.text(); } catch (e) {}
      throw new Error("HTTP " + res.status + (detail ? ": " + detail.slice(0, 200) : ""));
    }
    return true;
  }

  function liveReady() {
    var cfg = activeProvider();
    return !!(cfg.base && cfg.model && (cfg.key || !cfg.needsKey));
  }

  function isLiveMode() {
    return LSR.state.settings.activeModel === "live" && liveReady();
  }

  /* Unified completion used by Chat and Code Lab.
     kind: "chat" | "explain" | "debug" | "generate"
     - chat: prompt is the user message; history = prior messages
     - others: prompt is the full constructed prompt string      */
  async function complete(kind, prompt, opts) {
    opts = opts || {};
    if (isLiveMode()) {
      var cfg = activeProvider();
      var messages;
      if (kind === "chat") {
        messages = (opts.history || []).concat([{ role: "user", content: prompt }]);
      } else {
        messages = [
          { role: "system", content: "You are a senior software engineer. Answer with markdown. Keep code in fenced blocks." },
          { role: "user", content: prompt }
        ];
      }
      return streamChat({
        provider: cfg,
        messages: messages,
        onToken: opts.onToken,
        signal: opts.signal
      });
    }
    // Demo mode
    var text;
    if (kind === "chat") text = LSR.demo.generateResponse(prompt);
    else if (kind === "explain") text = LSR.demo.explainCode(opts.code || "", opts.lang || "javascript");
    else if (kind === "debug") text = LSR.demo.findBugs(opts.code || "", opts.lang || "javascript");
    else text = LSR.demo.generateCode(prompt, opts.lang || "javascript");
    var full = "";
    var gen = LSR.demo.streamText(text, opts.signal);
    while (true) {
      var step = await gen.next();
      if (step.done) break;
      full += step.value;
      if (opts.onToken) opts.onToken(step.value);
    }
    return full;
  }

  window.LSR = window.LSR || {};
  LSR.api = {
    streamChat: streamChat,
    testConnection: testConnection,
    liveReady: liveReady,
    isLiveMode: isLiveMode,
    complete: complete,
    getProvider: getProvider,
    providerConfig: providerConfig,
    activeProvider: activeProvider,
    // pure helpers, exposed for tests
    buildChatRequest: buildChatRequest,
    parseSSEData: parseSSEData
  };
})();
