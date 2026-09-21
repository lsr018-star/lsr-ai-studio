/* ============================================================
   LSR AI STUDIO — js/app.js
   App shell: module routing, top bar (model picker, mode
   pill), command palette, toasts, animated canvas background,
   settings page, global keyboard shortcuts, boot.
   ============================================================ */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  var MODULES = {
    chat: { title: "Chat", sub: "Streaming AI conversation" },
    codelab: { title: "Code Lab", sub: "Edit, run and AI-assist your code" },
    sites: { title: "Studio Sites", sub: "Build client-ready websites" },
    automations: { title: "Automations", sub: "Scheduled prompts & recurrences" },
    models: { title: "Models", sub: "Open models for the studio" },
    settings: { title: "Settings", sub: "Live API, appearance & data" }
  };

  /* ---------------- toasts ---------------- */
  var ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  function toast(message, type) {
    type = type || "info";
    var box = $("toasts");
    var el = document.createElement("div");
    el.className = "toast " + type;
    var icon = document.createElement("span");
    icon.className = "t-icon";
    icon.innerHTML = ICONS[type] || ICONS.info;
    var text = document.createElement("span");
    text.textContent = message;
    el.appendChild(icon);
    el.appendChild(text);
    box.appendChild(el);
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () { el.remove(); }, 260);
    }, 3400);
    while (box.children.length > 4) box.firstChild.remove();
  }

  /* ---------------- module routing ---------------- */

  var currentModule = "chat";

  function switchModule(name) {
    if (!MODULES[name]) return;
    currentModule = name;
    document.querySelectorAll(".nav-item").forEach(function (b) {
      b.classList.toggle("active", b.dataset.module === name);
    });
    document.querySelectorAll(".module").forEach(function (m) {
      m.classList.toggle("active", m.id === "module-" + name);
    });
    $("topbar-title").textContent = MODULES[name].title;
    $("topbar-sub").textContent = MODULES[name].sub;
    $("conv-section").style.display = name === "chat" ? "" : "none";
    document.body.classList.remove("sidebar-open");
  }

  /* ---------------- top bar: model picker + mode pill ---------------- */

  function refreshModelPicker() {
    var sel = $("model-select");
    var s = LSR.state.settings;
    sel.innerHTML = "";
    var demoOpt = document.createElement("option");
    demoOpt.value = "demo";
    demoOpt.textContent = "LSR Demo (built-in)";
    sel.appendChild(demoOpt);

    var cfg = LSR.api.activeProvider();
    var liveOpt = document.createElement("option");
    liveOpt.value = "live";
    liveOpt.textContent = "Live: " + cfg.name + " · " + (cfg.model || "…");
    sel.appendChild(liveOpt);
    sel.value = s.activeModel === "live" ? "live" : "demo";
    refreshModePill();
  }

  function refreshModePill() {
    var pill = $("mode-pill");
    var label = $("mode-label");
    var live = LSR.api.isLiveMode();
    pill.classList.toggle("live", live);
    pill.classList.toggle("demo", !live);
    label.textContent = live ? "Live" : "Demo";
    pill.title = live
      ? "Live mode — streaming from your configured endpoint"
      : "Demo mode — built-in client-side responses";
  }

  function onModelChange(e) {
    var v = e.target.value;
    if (v === "live" && !LSR.api.liveReady()) {
      var cfg = LSR.api.activeProvider();
      toast(cfg.needsKey
        ? "Add your free API key in Settings first (" + cfg.name + ")."
        : "Finish the provider setup in Settings first.", "error");
      e.target.value = "demo";
      LSR.state.settings.activeModel = "demo";
      switchModule("settings");
    } else {
      LSR.state.settings.activeModel = v;
      toast(v === "live" ? "Live mode enabled" : "Demo mode enabled", "info");
    }
    LSR.save();
    LSR.emit("settings-changed");
    refreshModePill();
  }

  /* ---------------- command palette ---------------- */

  var paletteCommands = [];
  var paletteSel = 0;

  function buildCommands() {
    paletteCommands = [
      { label: "Go to Chat", hint: "module", run: function () { switchModule("chat"); } },
      { label: "Go to Code Lab", hint: "module", run: function () { switchModule("codelab"); } },
      { label: "Go to Studio Sites", hint: "Alt+S", run: function () { switchModule("sites"); } },
      { label: "Go to Automations", hint: "module", run: function () { switchModule("automations"); } },
      { label: "Go to Models", hint: "module", run: function () { switchModule("models"); } },
      { label: "Go to Settings", hint: "module", run: function () { switchModule("settings"); } },
      { label: "New chat", hint: "Ctrl+N", run: function () { switchModule("chat"); LSR.chat.newConversation(); } },
      { label: "Generate image from prompt", hint: "chat", run: function () {
        switchModule("chat");
        setTimeout(function () { document.getElementById("btn-image").click(); }, 60);
      } },
      { label: "Export current site as HTML", hint: "sites", run: function () {
        switchModule("sites");
        setTimeout(function () { document.getElementById("btn-export-site").click(); }, 60);
      } },
      { label: "New code file", hint: "code lab", run: function () { switchModule("codelab"); document.getElementById("btn-add-file").click(); } },
      { label: "Add schedule", hint: "automations", run: function () { switchModule("automations"); document.getElementById("btn-add-sched").click(); } },
      { label: "Toggle background animation", hint: "appearance", run: function () {
        var s = LSR.state.settings;
        s.bgAnimation = !s.bgAnimation;
        LSR.save(); applyBgSetting(); syncSettingsForm();
        toast("Background animation " + (s.bgAnimation ? "on" : "off"), "info");
      } },
      { label: "Cycle accent theme", hint: "appearance", run: function () {
        var order = ["cyan", "violet", "emerald"];
        var s = LSR.state.settings;
        s.accent = order[(order.indexOf(s.accent) + 1) % order.length];
        LSR.save(); applyAccent(); syncSettingsForm();
        toast("Accent: " + s.accent, "info");
      } },
      { label: "Export data as JSON", hint: "data", run: exportData },
      { label: "Toggle Demo / Live mode", hint: "model", run: function () {
        var s = LSR.state.settings;
        if (s.activeModel === "live" || !LSR.api.liveReady()) {
          if (!LSR.api.liveReady()) { toast("Configure the Live API in Settings first.", "error"); switchModule("settings"); return; }
          s.activeModel = "demo";
        } else s.activeModel = "live";
        LSR.save(); LSR.emit("settings-changed"); refreshModelPicker();
      } }
    ];
  }

  function openPalette() {
    $("palette-overlay").classList.add("open");
    $("palette-input").value = "";
    paletteSel = 0;
    renderPalette("");
    setTimeout(function () { $("palette-input").focus(); }, 30);
  }

  function closePalette() {
    $("palette-overlay").classList.remove("open");
  }

  function renderPalette(query) {
    var q = query.trim().toLowerCase();
    var items = paletteCommands.filter(function (c) {
      return !q || c.label.toLowerCase().indexOf(q) !== -1 || (c.hint || "").toLowerCase().indexOf(q) !== -1;
    });
    var list = $("palette-list");
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = '<div class="palette-empty">No matching commands.</div>';
      return;
    }
    paletteSel = Math.min(paletteSel, items.length - 1);
    items.forEach(function (c, i) {
      var b = document.createElement("button");
      b.className = "palette-item" + (i === paletteSel ? " selected" : "");
      var label = document.createElement("span");
      label.textContent = c.label;
      var hint = document.createElement("span");
      hint.className = "kbd pkey";
      hint.textContent = c.hint || "";
      b.appendChild(label);
      b.appendChild(hint);
      b.addEventListener("click", function () { closePalette(); c.run(); });
      b.addEventListener("mousemove", function () {
        if (paletteSel !== i) { paletteSel = i; renderPalette($("palette-input").value); }
      });
      b._cmd = c;
      list.appendChild(b);
    });
    list._items = items;
  }

  function paletteKey(e) {
    var list = $("palette-list");
    var items = list._items || [];
    if (e.key === "ArrowDown") { e.preventDefault(); paletteSel = Math.min(paletteSel + 1, items.length - 1); renderPalette($("palette-input").value); }
    else if (e.key === "ArrowUp") { e.preventDefault(); paletteSel = Math.max(paletteSel - 1, 0); renderPalette($("palette-input").value); }
    else if (e.key === "Enter") {
      e.preventDefault();
      var cmd = items[paletteSel];
      if (cmd) { closePalette(); cmd.run(); }
    }
  }

  /* ---------------- settings page ---------------- */

  /* ---------------- settings page: provider picker ---------------- */

  function renderProviderList() {
    var wrap = $("provider-list");
    if (!wrap) return;
    wrap.innerHTML = "";
    var cur = LSR.state.settings.providerId;
    LSR.PROVIDERS.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "provider-card" + (p.id === cur ? " selected" : "");
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", p.id === cur ? "true" : "false");

      var top = document.createElement("div");
      top.className = "pc-top";
      var nm = document.createElement("span");
      nm.className = "pc-name";
      nm.textContent = p.name;
      var tag = document.createElement("span");
      tag.className = "pc-tag" + (p.needsKey ? "" : " free");
      tag.textContent = p.tag;
      top.appendChild(nm);
      top.appendChild(tag);

      var blurb = document.createElement("div");
      blurb.className = "pc-blurb";
      blurb.textContent = p.blurb;

      b.appendChild(top);
      b.appendChild(blurb);
      b.addEventListener("click", function () { selectProvider(p.id); });
      wrap.appendChild(b);
    });
    syncProviderForm();
  }

  function selectProvider(id) {
    LSR.state.settings.providerId = id;
    LSR.save();
    renderProviderList();
    LSR.emit("settings-changed");
    refreshModelPicker();
    toast("Provider: " + LSR.api.activeProvider().name, "info");
  }

  function syncProviderForm() {
    var cfg = LSR.api.activeProvider();
    $("set-api-base").value = cfg.base || "";
    $("set-api-key").value = cfg.key || "";
    $("set-model").value = cfg.model || "";
    $("set-api-key-wrap").style.display = cfg.needsKey ? "" : "none";
    $("set-api-base").readOnly = false;
    $("provider-hint").textContent = cfg.needsKey
      ? cfg.blurb + " Paste your key below — it never leaves this browser except to " + cfg.name + "."
      : cfg.blurb + " You're good to go — just flip the top-bar picker to Live.";
  }

  function syncSettingsForm() {
    var s = LSR.state.settings;
    renderProviderList();
    $("set-bg-anim").checked = !!s.bgAnimation;
    document.querySelectorAll(".accent-swatch").forEach(function (b) {
      b.classList.toggle("selected", b.dataset.accent === s.accent);
    });
  }

  function applyAccent() {
    document.documentElement.dataset.accent = LSR.state.settings.accent || "cyan";
  }

  function applyBgSetting() {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var on = LSR.state.settings.bgAnimation && !reduce;
    document.body.classList.toggle("no-motion", !on);
    bgEnabled = on;
  }

  function saveApiSettings() {
    var s = LSR.state.settings;
    var cfg = s.providers[s.providerId] || (s.providers[s.providerId] = {});
    cfg.base = $("set-api-base").value.trim().replace(/\/+$/, "");
    cfg.key = $("set-api-key").value.trim();
    cfg.model = $("set-model").value.trim();
    if (cfg.base && !/^https?:\/\//i.test(cfg.base)) {
      toast("Base URL should start with http:// or https://", "error");
      return;
    }
    LSR.save();
    LSR.emit("settings-changed");
    refreshModelPicker();
    toast("Saved for " + LSR.api.activeProvider().name, "success");
  }

  async function testApi() {
    saveApiSettingsSilent();
    var cfg = LSR.api.activeProvider();
    if (!LSR.api.liveReady()) {
      toast("Fill in Base URL and model" + (cfg.needsKey ? ", plus your API key" : "") + " first.", "error");
      return;
    }
    toast("Testing " + cfg.name + "…", "info");
    try {
      await LSR.api.testConnection(cfg);
      toast("Connection successful — " + cfg.model + " responded.", "success");
    } catch (err) {
      toast("Connection failed: " + err.message, "error");
    }
  }

  function saveApiSettingsSilent() {
    var s = LSR.state.settings;
    var cfg = s.providers[s.providerId] || (s.providers[s.providerId] = {});
    cfg.base = $("set-api-base").value.trim().replace(/\/+$/, "");
    cfg.key = $("set-api-key").value.trim();
    cfg.model = $("set-model").value.trim();
    LSR.save();
    LSR.emit("settings-changed");
    refreshModelPicker();
  }

  function resetProvider() {
    var id = LSR.state.settings.providerId;
    var p = LSR.api.getProvider(id);
    LSR.state.settings.providers[id] = { base: p.base, model: p.model, key: "" };
    LSR.save();
    syncProviderForm();
    LSR.emit("settings-changed");
    refreshModelPicker();
    toast("Provider reset to defaults", "info");
  }

  function exportData() {
    var blob = new Blob([LSR.exportData()], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lsr-ai-studio-export-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast("Data exported", "success");
  }

  function importDataFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        LSR.importData(String(reader.result));
        applyAccent();
        applyBgSetting();
        syncSettingsForm();
        refreshModelPicker();
        LSR.emit("conversations-changed");
        LSR.emit("files-changed");
        LSR.emit("schedules-changed");
        location.reload();
      } catch (err) {
        toast("Import failed: " + err.message, "error");
      }
    };
    reader.readAsText(file);
  }

  function bindSettings() {
    $("btn-save-api").addEventListener("click", saveApiSettings);
    $("btn-test-api").addEventListener("click", testApi);
    $("btn-reset-provider").addEventListener("click", resetProvider);
    document.querySelectorAll(".accent-swatch").forEach(function (b) {
      b.addEventListener("click", function () {
        LSR.state.settings.accent = b.dataset.accent;
        LSR.save();
        applyAccent();
        syncSettingsForm();
        toast("Accent: " + b.dataset.accent, "info");
      });
    });
    $("set-bg-anim").addEventListener("change", function (e) {
      LSR.state.settings.bgAnimation = e.target.checked;
      LSR.save();
      applyBgSetting();
    });
    $("btn-export").addEventListener("click", exportData);
    $("btn-import").addEventListener("click", function () { $("import-file").click(); });
    $("import-file").addEventListener("change", function (e) {
      if (e.target.files[0]) importDataFile(e.target.files[0]);
      e.target.value = "";
    });
    $("btn-clear-data").addEventListener("click", function () {
      if (!window.confirm("Delete ALL conversations, files, schedules and settings? This cannot be undone.")) return;
      LSR.clearAll();
      location.reload();
    });
  }

  /* ---------------- background canvas ---------------- */

  var bgEnabled = true;
  var bgCtx = null, bgParticles = [], bgOrbs = [];
  var bgW = 0, bgH = 0, bgT = 0, bgLast = 0;

  function initBackground() {
    var canvas = $("bg-canvas");
    bgCtx = canvas.getContext("2d");
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      bgW = window.innerWidth; bgH = window.innerHeight;
      canvas.width = bgW * dpr; canvas.height = bgH * dpr;
      bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }
    function seed() {
      var n = Math.min(90, Math.floor(bgW * bgH / 22000));
      bgParticles = [];
      for (var i = 0; i < n; i++) {
        bgParticles.push({
          x: Math.random() * bgW,
          y: Math.random() * bgH,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.6 + 0.4,
          hue: Math.random() < 0.6 ? 190 : 265,
          a: Math.random() * 0.5 + 0.15
        });
      }
      bgOrbs = [
        { x: bgW * 0.18, y: bgH * 0.12, r: Math.min(bgW, bgH) * 0.28, hue: 190, dx: 0.14, dy: 0.1, ph: 0 },
        { x: bgW * 0.85, y: bgH * 0.85, r: Math.min(bgW, bgH) * 0.32, hue: 265, dx: -0.11, dy: -0.13, ph: 2 },
        { x: bgW * 0.7, y: bgH * 0.2, r: Math.min(bgW, bgH) * 0.2, hue: 160, dx: -0.08, dy: 0.12, ph: 4 }
      ];
    }
    window.addEventListener("resize", resize);
    resize();
    bgLast = performance.now();
    requestAnimationFrame(tick);
  }

  function tick(now) {
    requestAnimationFrame(tick);
    if (!bgEnabled || document.hidden) return;
    var dt = Math.min((now - bgLast) / 16.7, 3);
    bgLast = now;
    bgT += 0.008 * dt;
    var ctx = bgCtx;
    ctx.clearRect(0, 0, bgW, bgH);

    // orbs
    bgOrbs.forEach(function (o) {
      o.x += o.dx * dt; o.y += o.dy * dt;
      if (o.x < -o.r) o.x = bgW + o.r; if (o.x > bgW + o.r) o.x = -o.r;
      if (o.y < -o.r) o.y = bgH + o.r; if (o.y > bgH + o.r) o.y = -o.r;
      var g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      var pulse = 0.05 + 0.02 * Math.sin(bgT * 2 + o.ph);
      g.addColorStop(0, "hsla(" + o.hue + ", 90%, 60%, " + pulse + ")");
      g.addColorStop(1, "hsla(" + o.hue + ", 90%, 60%, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
    });

    // particles + links
    var i, j, p;
    for (i = 0; i < bgParticles.length; i++) {
      p = bgParticles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 0) p.x = bgW; if (p.x > bgW) p.x = 0;
      if (p.y < 0) p.y = bgH; if (p.y > bgH) p.y = 0;
    }
    ctx.lineWidth = 1;
    for (i = 0; i < bgParticles.length; i++) {
      p = bgParticles[i];
      for (j = i + 1; j < bgParticles.length; j++) {
        var q = bgParticles[j];
        var dx = p.x - q.x, dy = p.y - q.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 130 * 130) {
          ctx.strokeStyle = "hsla(210, 80%, 70%, " + (0.07 * (1 - d2 / 16900)) + ")";
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      ctx.fillStyle = "hsla(" + p.hue + ", 90%, 70%, " + p.a + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
  }

  /* ---------------- global keys / sidebar ---------------- */

  function bindGlobal() {
    document.querySelectorAll(".nav-item").forEach(function (b) {
      b.addEventListener("click", function () { switchModule(b.dataset.module); });
    });
    $("btn-menu").addEventListener("click", function () {
      document.body.classList.toggle("sidebar-open");
    });
    $("scrim").addEventListener("click", function () {
      document.body.classList.remove("sidebar-open");
    });
    $("btn-palette").addEventListener("click", openPalette);
    $("palette-overlay").addEventListener("click", function (e) {
      if (e.target === $("palette-overlay")) closePalette();
    });
    $("palette-input").addEventListener("input", function (e) {
      paletteSel = 0;
      renderPalette(e.target.value);
    });
    $("palette-input").addEventListener("keydown", paletteKey);
    $("model-select").addEventListener("change", onModelChange);

    document.addEventListener("keydown", function (e) {
      var mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if ($("palette-overlay").classList.contains("open")) closePalette();
        else openPalette();
      } else if (mod && e.key.toLowerCase() === "n") {
        // don't hijack when typing in the code editor / inputs
        var tag = (document.activeElement && document.activeElement.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        switchModule("chat");
        LSR.chat.newConversation();
      } else if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        switchModule("sites");
      } else if (e.key === "Escape") {
        if ($("palette-overlay").classList.contains("open")) closePalette();
        else if (document.body.classList.contains("sidebar-open")) document.body.classList.remove("sidebar-open");
        else LSR.chat.stopStream();
      }
    });

    LSR.on("settings-changed", function () { refreshModePill(); });
  }

  /* ---------------- PWA: service worker (http(s) only) ---------------- */

  function registerSW() {
    try {
      if (!("serviceWorker" in navigator)) return;
      // file:// must never attempt registration — it would throw.
      if (location.protocol !== "http:" && location.protocol !== "https:") return;
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () { /* offline-first is best-effort */ });
      });
    } catch (e) { /* never break boot over PWA */ }
  }

  /* ---------------- boot ---------------- */

  function boot() {
    buildCommands();
    bindGlobal();
    bindSettings();
    applyAccent();
    applyBgSetting();
    initBackground();
    syncSettingsForm();
    refreshModelPicker();
    LSR.chat.init();
    LSR.codelab.init();
    LSR.sites.init();
    LSR.automations.init();
    registerSW();
    switchModule("chat");
  }

  window.LSR = window.LSR || {};
  LSR.toast = toast;
  LSR.switchModule = switchModule;
  LSR.refreshModelPicker = refreshModelPicker;
  LSR.refreshModePill = refreshModePill;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
