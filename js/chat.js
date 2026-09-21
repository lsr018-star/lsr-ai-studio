/* ============================================================
   LSR AI STUDIO — js/chat.js
   Chat module: conversations (new/rename/delete), streaming
   replies with lite-markdown, stop/regenerate, stats, copy.
   ============================================================ */
(function () {
  "use strict";

  var els = {};
  var streaming = null; // { abort: fn, msgEl, convId }

  function $(id) { return document.getElementById(id); }

  function init() {
    els = {
      list: $("conv-list"),
      messages: $("chat-messages"),
      scroll: $("chat-scroll"),
      input: $("chat-input"),
      send: $("btn-send"),
      imgBtn: $("btn-image"),
      newChat: $("btn-new-chat"),
      statMsgs: $("stat-msgs"),
      statTokens: $("stat-tokens"),
      statModel: $("stat-model")
    };

    els.newChat.addEventListener("click", newConversation);
    els.send.addEventListener("click", onSendClick);
    els.imgBtn.addEventListener("click", generateImage);
    els.input.addEventListener("keydown", onInputKey);
    els.input.addEventListener("input", autoresize);
    // Copy buttons inside rendered markdown (event delegation)
    els.messages.addEventListener("click", onMessagesClick);

    LSR.on("conversations-changed", renderConvList);
    LSR.on("settings-changed", updateStats);

    if (!LSR.state.activeConvId && LSR.state.conversations.length) {
      LSR.state.activeConvId = LSR.state.conversations[0].id;
    }
    renderConvList();
    renderActive();
    autoresize();
  }

  /* ---------- conversations ---------- */

  function activeConv() {
    return LSR.state.conversations.find(function (c) { return c.id === LSR.state.activeConvId; }) || null;
  }

  function newConversation() {
    stopStream();
    var conv = {
      id: LSR.uid("conv"),
      title: "New conversation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };
    LSR.state.conversations.unshift(conv);
    LSR.state.activeConvId = conv.id;
    LSR.save();
    LSR.emit("conversations-changed");
    renderActive();
    els.input.focus();
  }

  function renameConversation(id) {
    var conv = LSR.state.conversations.find(function (c) { return c.id === id; });
    if (!conv) return;
    var name = window.prompt("Rename conversation", conv.title);
    if (name && name.trim()) {
      conv.title = name.trim().slice(0, 60);
      conv.updatedAt = Date.now();
      LSR.save();
      LSR.emit("conversations-changed");
    }
  }

  function deleteConversation(id) {
    var conv = LSR.state.conversations.find(function (c) { return c.id === id; });
    if (!conv) return;
    if (!window.confirm("Delete \"" + conv.title + "\"?")) return;
    if (streaming && streaming.convId === id) stopStream();
    LSR.state.conversations = LSR.state.conversations.filter(function (c) { return c.id !== id; });
    if (LSR.state.activeConvId === id) {
      LSR.state.activeConvId = LSR.state.conversations.length ? LSR.state.conversations[0].id : null;
    }
    LSR.save();
    LSR.emit("conversations-changed");
    renderActive();
    LSR.toast("Conversation deleted", "info");
  }

  function switchConversation(id) {
    if (streaming) stopStream();
    LSR.state.activeConvId = id;
    LSR.save();
    LSR.emit("conversations-changed");
    renderActive();
  }

  function renderConvList() {
    els.list.innerHTML = "";
    if (!LSR.state.conversations.length) {
      var empty = document.createElement("div");
      empty.style.cssText = "padding:14px 10px;font-size:12.5px;color:var(--muted-2);line-height:1.6";
      empty.textContent = "No conversations yet. Start a new chat above.";
      els.list.appendChild(empty);
      return;
    }
    LSR.state.conversations.forEach(function (conv) {
      var btn = document.createElement("div");
      btn.className = "conv-item" + (conv.id === LSR.state.activeConvId ? " active" : "");
      btn.setAttribute("role", "listitem");

      var title = document.createElement("span");
      title.className = "title";
      title.textContent = conv.title;
      title.title = conv.title;
      btn.appendChild(title);

      var tools = document.createElement("span");
      tools.className = "icon-btns";

      var rn = document.createElement("button");
      rn.className = "icon-btn";
      rn.title = "Rename";
      rn.setAttribute("aria-label", "Rename conversation");
      rn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>';
      rn.addEventListener("click", function (e) { e.stopPropagation(); renameConversation(conv.id); });

      var del = document.createElement("button");
      del.className = "icon-btn danger";
      del.title = "Delete";
      del.setAttribute("aria-label", "Delete conversation");
      del.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      del.addEventListener("click", function (e) { e.stopPropagation(); deleteConversation(conv.id); });

      tools.appendChild(rn);
      tools.appendChild(del);
      btn.appendChild(tools);
      btn.addEventListener("click", function () { switchConversation(conv.id); });
      els.list.appendChild(btn);
    });
  }

  /* ---------- message rendering ---------- */

  function renderActive() {
    var conv = activeConv();
    els.messages.innerHTML = "";
    if (!conv || !conv.messages.length) {
      renderEmptyState();
    } else {
      conv.messages.forEach(function (m) { appendMessageEl(m.role, m.content, false); });
    }
    updateStats();
    scrollBottom(true);
  }

  function renderEmptyState() {
    var wrap = document.createElement("div");
    wrap.className = "empty-state";
    wrap.innerHTML =
      '<div class="empty-orb">LS</div>' +
      "<h2>What shall we build today?</h2>" +
      "<p>Ask anything, generate code, or brainstorm ideas. " +
      "Streaming answers with markdown, code blocks and one-click copy.</p>" +
      '<div class="suggestion-chips"></div>';
    var chips = wrap.querySelector(".suggestion-chips");
    ["Write a fibonacci function", "Explain quicksort", "How do I fetch data from an API?", "Help me debug my code"]
      .forEach(function (s) {
        var b = document.createElement("button");
        b.className = "chip";
        b.textContent = s;
        b.addEventListener("click", function () { els.input.value = s; autoresize(); sendMessage(); });
        chips.appendChild(b);
      });
    els.messages.appendChild(wrap);
  }

  function appendMessageEl(role, content, animate) {
    var empty = els.messages.querySelector(".empty-state");
    if (empty) empty.remove();

    var msg = document.createElement("div");
    msg.className = "msg " + role;

    var avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = role === "user" ? "You".slice(0, 1) : "LS";
    avatar.setAttribute("aria-hidden", "true");

    var body = document.createElement("div");
    body.className = "msg-body";

    var roleEl = document.createElement("div");
    roleEl.className = "msg-role";
    roleEl.textContent = role === "user" ? "You" : "LSR AI";

    var contentEl = document.createElement("div");
    contentEl.className = "msg-content" + (role === "assistant" ? " md" : "");

    body.appendChild(roleEl);
    body.appendChild(contentEl);

    if (role === "assistant") {
      var actions = document.createElement("div");
      actions.className = "msg-actions";

      var copy = document.createElement("button");
      copy.className = "icon-btn";
      copy.title = "Copy message";
      copy.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      copy.addEventListener("click", function () {
        navigator.clipboard.writeText(contentEl.dataset.raw || "").then(
          function () { LSR.toast("Copied to clipboard", "success"); },
          function () { LSR.toast("Copy failed", "error"); });
      });

      var regen = document.createElement("button");
      regen.className = "icon-btn";
      regen.title = "Regenerate response";
      regen.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
      regen.addEventListener("click", function () { regenerate(msg); });

      actions.appendChild(copy);
      actions.appendChild(regen);
      body.appendChild(actions);
    }

    msg.appendChild(avatar);
    msg.appendChild(body);
    els.messages.appendChild(msg);
    setMessageContent(contentEl, content, role);
    if (animate !== false) scrollBottom();
    return { msg: msg, contentEl: contentEl };
  }

  function setMessageContent(contentEl, content, role) {
    contentEl.dataset.raw = content;
    if (role === "user") {
      contentEl.textContent = content;
    } else {
      contentEl.innerHTML = LSR.renderMarkdown(content);
    }
  }

  function onMessagesClick(e) {
    var btn = e.target.closest(".copy-btn");
    if (!btn) return;
    var idx = parseInt(btn.getAttribute("data-copy-idx"), 10);
    var code = LSR.getRenderedCode(idx);
    var done = function () {
      btn.classList.add("copied");
      btn.textContent = "Copied";
      setTimeout(function () { btn.classList.remove("copied"); btn.textContent = "Copy"; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done, function () { LSR.toast("Copy failed", "error"); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (err) { LSR.toast("Copy failed", "error"); }
      ta.remove();
    }
  }

  /* ---------- sending / streaming ---------- */

  function onInputKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function onSendClick() {
    if (streaming) stopStream();
    else sendMessage();
  }

  function setSendMode(mode) {
    // mode: "send" | "stop"
    var icon = $("send-icon");
    if (mode === "stop") {
      els.send.classList.add("stop");
      els.send.title = "Stop generating (Esc)";
      els.send.setAttribute("aria-label", "Stop generating");
      icon.innerHTML = '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>';
    } else {
      els.send.classList.remove("stop");
      els.send.title = "Send";
      els.send.setAttribute("aria-label", "Send message");
      icon.innerHTML = '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>';
    }
  }

  function ensureLiveOk() {
    if (LSR.state.settings.activeModel === "live" && !LSR.api.liveReady()) {
      LSR.toast("Live mode needs a Base URL, API key and model in Settings.", "error");
      LSR.switchModule("settings");
      return false;
    }
    return true;
  }

  function sendMessage(presetText) {
    var text = (typeof presetText === "string" ? presetText : els.input.value).trim();
    if (!text || streaming) return;
    if (!ensureLiveOk()) return;

    var conv = activeConv();
    if (!conv) {
      newConversation();
      conv = activeConv();
    }
    if (typeof presetText !== "string") { els.input.value = ""; autoresize(); }

    conv.messages.push({ role: "user", content: text });
    if (conv.messages.length === 1) {
      conv.title = text.slice(0, 48) + (text.length > 48 ? "…" : "");
      LSR.emit("conversations-changed");
    }
    conv.updatedAt = Date.now();

    appendMessageEl("user", text);
    runAssistant(conv, text, null);
    LSR.save();
  }

  function regenerate(assistantMsgEl) {
    if (streaming) return;
    if (!ensureLiveOk()) return;
    var conv = activeConv();
    if (!conv || conv.messages.length < 2) return;
    // remove last assistant message (and keep its preceding user message)
    var last = conv.messages[conv.messages.length - 1];
    if (last.role !== "assistant") return;
    conv.messages.pop();
    var userMsg = conv.messages[conv.messages.length - 1];
    assistantMsgEl.remove();
    runAssistant(conv, userMsg.content, null);
    LSR.save();
  }

  function runAssistant(conv, userText, historyOverride) {
    var history = (historyOverride || conv.messages.slice(0, -1)).map(function (m) {
      return { role: m.role, content: m.content };
    });

    var el = appendMessageEl("assistant", "", false);
    el.contentEl.classList.add("stream-cursor");
    var full = "";
    var aborted = false;
    var controller = new AbortController();

    setSendMode("stop");
    streaming = {
      convId: conv.id,
      abort: function () { aborted = true; try { controller.abort(); } catch (e) {} }
    };

    function onToken(chunk) {
      if (aborted) return;
      full += chunk;
      // During streaming show raw text; final markdown render on completion.
      el.contentEl.textContent = full;
      scrollBottom();
    }

    LSR.api.complete("chat", userText, {
      history: history,
      signal: controller.signal,
      onToken: onToken
    }).then(function (result) {
      finish(result !== undefined ? result : full, false);
    }).catch(function (err) {
      if (aborted || (err && err.name === "AbortError")) { finish(full, true); return; }
      el.msg.remove();
      LSR.toast("Request failed: " + (err && err.message ? err.message : err), "error");
      setSendMode("send");
      streaming = null;
    });

    function finish(text, wasStopped) {
      streaming = null;
      setSendMode("send");
      el.contentEl.classList.remove("stream-cursor");
      if (!text) {
        el.msg.remove();
        if (wasStopped) LSR.toast("Generation stopped", "info");
        return;
      }
      conv.messages.push({ role: "assistant", content: text });
      conv.updatedAt = Date.now();
      setMessageContent(el.contentEl, text, "assistant");
      scrollBottom();
      updateStats();
      LSR.save();
      if (wasStopped) LSR.toast("Generation stopped", "info");
    }
  }

  function stopStream() {
    if (streaming) streaming.abort();
  }

  /* ---------- stats / misc ---------- */

  function updateStats() {
    var conv = activeConv();
    var msgs = conv ? conv.messages.length : 0;
    var chars = conv ? conv.messages.reduce(function (n, m) { return n + m.content.length; }, 0) : 0;
    els.statMsgs.textContent = msgs;
    els.statTokens.textContent = Math.ceil(chars / 4).toLocaleString();
    els.statModel.textContent = LSR.api.isLiveMode()
      ? "live:" + LSR.api.activeProvider().name
      : "demo";
  }

  function scrollBottom(instant) {
    requestAnimationFrame(function () {
      els.scroll.scrollTop = els.scroll.scrollHeight;
    });
  }

  function autoresize() {
    els.input.style.height = "auto";
    els.input.style.height = Math.min(els.input.scrollHeight, 180) + "px";
  }

  /* Public: used by Automations "Run now" */
  function sendFromAutomation(prompt) {
    LSR.switchModule("chat");
    setTimeout(function () { sendMessage(prompt); }, 60);
  }

  /* Free image generation via Pollinations: inserts the generated
     image URL as markdown. No fetch needed — the browser loads it. */
  function generateImage() {
    var prompt = els.input.value.trim();
    if (!prompt) {
      LSR.toast("Describe the image first, then press the image button.", "info");
      els.input.focus();
      return;
    }
    var conv = activeConv();
    if (!conv) {
      newConversation();
      conv = activeConv();
    }
    // encodeURIComponent leaves ( ) unescaped — encode them so the
    // markdown ![alt](url) wrapper isn't broken.
    var q = encodeURIComponent(prompt).replace(/\(/g, "%28").replace(/\)/g, "%29");
    var seed = Math.floor(Math.random() * 999999);
    var url = "https://image.pollinations.ai/prompt/" + q +
      "?width=1024&height=1024&seed=" + seed + "&nologo=true";
    var alt = prompt.slice(0, 60).replace(/[\[\]]/g, "");
    els.input.value = "";
    autoresize();
    conv.messages.push({ role: "user", content: "🎨 " + prompt });
    conv.messages.push({
      role: "assistant",
      content: "Here's your image for **\"" + prompt.slice(0, 80) + "\"**:\n\n![" + alt + "](" + url + ")"
    });
    conv.updatedAt = Date.now();
    LSR.save();
    LSR.emit("conversations-changed");
    renderActive();
    LSR.toast("Image generated", "success");
  }

  window.LSR = window.LSR || {};
  LSR.chat = {
    init: init,
    newConversation: newConversation,
    sendFromAutomation: sendFromAutomation,
    stopStream: stopStream,
    activeConv: activeConv
  };
})();
