/* ============================================================
   LSR AI STUDIO — js/api.js
   Live backend: OpenAI-compatible /chat/completions streaming
   via fetch + ReadableStream SSE parsing. Plus LSR.ai.complete,
   the single router that picks Demo vs Live for every feature.
   ============================================================ */
(function () {
  "use strict";

  function joinUrl(base, path) {
    return String(base).replace(/\/+$/, "") + path;
  }

  /* Stream chat completions. onToken receives text deltas.
     Resolves with the full text. Rejects on HTTP/network error. */
  async function streamChat(opts) {
    var base = joinUrl(opts.baseUrl, "/chat/completions");
    var ctrl = opts.signal ? null : new AbortController();
    var signal = opts.signal || ctrl.signal;

    var res = await fetch(base, {
      method: "POST",
      signal: signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + opts.apiKey
      },
      body: JSON.stringify({
        model: opts.model,
        stream: true,
        messages: opts.messages
      })
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
        var data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          var json = JSON.parse(data);
          var delta = json.choices && json.choices[0] && json.choices[0].delta;
          var content = delta && delta.content ? delta.content : "";
          if (content) { full += content; if (opts.onToken) opts.onToken(content); }
        } catch (e) { /* skip malformed SSE line */ }
      }
    }
    return full;
  }

  /* Quick non-streaming probe used by "Test connection". */
  async function testConnection(baseUrl, apiKey, model) {
    var res = await fetch(joinUrl(baseUrl, "/chat/completions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: model,
        stream: false,
        max_tokens: 8,
        messages: [{ role: "user", content: "Reply with the single word: ok" }]
      })
    });
    if (!res.ok) {
      var detail = "";
      try { detail = await res.text(); } catch (e) {}
      throw new Error("HTTP " + res.status + (detail ? ": " + detail.slice(0, 200) : ""));
    }
    return true;
  }

  function liveReady() {
    var s = LSR.state.settings;
    return !!(s.apiBase && s.apiKey && s.model);
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
      var s = LSR.state.settings;
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
        baseUrl: s.apiBase,
        apiKey: s.apiKey,
        model: s.model,
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
    complete: complete
  };
})();
