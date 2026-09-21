/* ============================================================
   LSR AI STUDIO — js/codelab.js
   Code Lab: file tabs, overlay editor with line numbers and
   regex syntax highlighting (JS / Python / HTML), AI side
   panel (explain, debug, generate), and safe-ish JS runner.
   ============================================================ */
(function () {
  "use strict";

  var els = {};
  var aiStreaming = null;

  function $(id) { return document.getElementById(id); }

  var LANGS = {
    javascript: { label: "JS", exts: ["js", "jsx", "ts"] },
    python: { label: "PY", exts: ["py"] },
    html: { label: "HTML", exts: ["html", "htm"] }
  };

  function langFromName(name) {
    var ext = (name.split(".").pop() || "").toLowerCase();
    for (var lang in LANGS) {
      if (LANGS[lang].exts.indexOf(ext) !== -1) return lang;
    }
    return "javascript";
  }

  function init() {
    els = {
      tabs: $("file-tabs"),
      addFile: null,
      badge: $("lang-badge"),
      gutter: $("gutter"),
      hl: $("hl-code"),
      input: $("code-input"),
      run: $("btn-run"),
      rename: $("btn-rename-file"),
      output: $("output-body"),
      clearOutput: $("btn-clear-output"),
      aiExplain: $("ai-explain"),
      aiDebug: $("ai-debug"),
      aiGenerate: $("ai-generate"),
      aiPrompt: $("ai-prompt"),
      aiResult: $("ai-result"),
      aiResultActions: $("ai-result-actions")
    };

    // "add file" tab button
    var add = document.createElement("button");
    add.className = "tab-add";
    add.id = "btn-add-file";
    add.title = "New file";
    add.setAttribute("aria-label", "New file");
    add.textContent = "+";
    add.addEventListener("click", addFile);
    els.tabs.appendChild(add);
    els.addFile = add;

    els.input.addEventListener("input", onEdit);
    els.input.addEventListener("scroll", syncScroll);
    els.input.addEventListener("keydown", onEditorKey);
    els.run.addEventListener("click", runCode);
    els.rename.addEventListener("click", renameFile);
    els.clearOutput.addEventListener("click", function () {
      els.output.innerHTML = '<span class="log-dim">// Output cleared.</span>';
    });

    els.aiExplain.addEventListener("click", function () { aiAction("explain"); });
    els.aiDebug.addEventListener("click", function () { aiAction("debug"); });
    els.aiGenerate.addEventListener("click", function () { aiAction("generate"); });
    els.aiPrompt.addEventListener("keydown", function (e) {
      if (e.key === "Enter") aiAction("generate");
    });

    LSR.on("files-changed", renderTabs);
    renderTabs();
    activateFile(LSR.state.activeFileId);
  }

  /* ---------- files ---------- */

  function activeFile() {
    return LSR.state.files.find(function (f) { return f.id === LSR.state.activeFileId; }) || null;
  }

  function addFile() {
    var name = window.prompt("File name (e.g. app.js, main.py, index.html)", "untitled.js");
    if (!name || !name.trim()) return;
    name = name.trim();
    if (LSR.state.files.some(function (f) { return f.name === name; })) {
      LSR.toast("A file with that name already exists.", "error");
      return;
    }
    var file = { id: LSR.uid("file"), name: name, lang: langFromName(name), content: "" };
    LSR.state.files.push(file);
    LSR.state.activeFileId = file.id;
    LSR.save();
    LSR.emit("files-changed");
    activateFile(file.id);
    els.input.focus();
    LSR.toast("Created " + name, "success");
  }

  function renameFile() {
    var f = activeFile();
    if (!f) return;
    var name = window.prompt("Rename file", f.name);
    if (!name || !name.trim() || name.trim() === f.name) return;
    name = name.trim();
    if (LSR.state.files.some(function (x) { return x.name === name && x.id !== f.id; })) {
      LSR.toast("A file with that name already exists.", "error");
      return;
    }
    f.name = name;
    f.lang = langFromName(name);
    LSR.save();
    LSR.emit("files-changed");
    activateFile(f.id);
  }

  function closeFile(id) {
    var f = LSR.state.files.find(function (x) { return x.id === id; });
    if (!f) return;
    if (LSR.state.files.length === 1) {
      LSR.toast("You need at least one file.", "info");
      return;
    }
    if (!window.confirm("Close \"" + f.name + "\"? Unsaved work is auto-saved, but the tab will be removed.")) return;
    LSR.state.files = LSR.state.files.filter(function (x) { return x.id !== id; });
    if (LSR.state.activeFileId === id) LSR.state.activeFileId = LSR.state.files[0].id;
    LSR.save();
    LSR.emit("files-changed");
    activateFile(LSR.state.activeFileId);
  }

  var DOT_COLORS = { javascript: "#f7df1e", python: "#4b8bbe", html: "#e34c26" };

  function renderTabs() {
    // remove all tabs except the "+" button
    Array.from(els.tabs.querySelectorAll(".file-tab")).forEach(function (t) { t.remove(); });
    LSR.state.files.forEach(function (f) {
      var tab = document.createElement("button");
      tab.className = "file-tab" + (f.id === LSR.state.activeFileId ? " active" : "");
      tab.setAttribute("role", "tab");
      tab.title = f.name + " — double-click to rename";

      var dot = document.createElement("span");
      dot.className = "tab-dot";
      dot.style.background = DOT_COLORS[f.lang] || "#8b96b8";

      var name = document.createElement("span");
      name.textContent = f.name;

      var x = document.createElement("span");
      x.className = "tab-close";
      x.textContent = "×";
      x.title = "Close file";
      x.setAttribute("role", "button");
      x.addEventListener("click", function (e) { e.stopPropagation(); closeFile(f.id); });

      tab.appendChild(dot);
      tab.appendChild(name);
      tab.appendChild(x);
      tab.addEventListener("click", function () { activateFile(f.id); });
      tab.addEventListener("dblclick", function () {
        if (f.id === LSR.state.activeFileId) renameFile();
        else { activateFile(f.id); renameFile(); }
      });
      els.tabs.insertBefore(tab, els.addFile);
    });
  }

  function activateFile(id) {
    var f = LSR.state.files.find(function (x) { return x.id === id; });
    if (!f) return;
    LSR.state.activeFileId = id;
    LSR.save();
    els.input.value = f.content || "";
    els.badge.textContent = (LANGS[f.lang] || LANGS.javascript).label;
    refreshHighlight();
    renderTabs();
    stopAiStream();
  }

  function onEdit() {
    var f = activeFile();
    if (!f) return;
    f.content = els.input.value;
    LSR.save();
    refreshHighlight();
  }

  function onEditorKey(e) {
    // Tab inserts two spaces instead of moving focus
    if (e.key === "Tab") {
      e.preventDefault();
      var ta = els.input;
      var start = ta.selectionStart, end = ta.selectionEnd;
      ta.value = ta.value.slice(0, start) + "  " + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = start + 2;
      onEdit();
    }
  }

  function syncScroll() {
    els.hl.parentElement.scrollTop = els.input.scrollTop;
    els.hl.parentElement.scrollLeft = els.input.scrollLeft;
    els.gutter.scrollTop = els.input.scrollTop;
  }

  /* ---------- syntax highlighting ---------- */

  var JS_TOKEN = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|export|from|default|try|catch|finally|throw|typeof|instanceof|in|of|await|async|yield|this|true|false|null|undefined)\b|\b(console|Math|JSON|Object|Array|String|Number|Boolean|Promise|Date|RegExp|Error|Map|Set|document|window|process|module|require)\b|([A-Za-z_$][\w$]*)(?=\s*\()/g;
  var PY_TOKEN = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\b\d+(?:\.\d+)?\b)|\b(def|class|return|if|elif|else|for|while|in|not|and|or|is|import|from|as|with|try|except|finally|raise|lambda|pass|break|continue|yield|global|nonlocal|assert|del|True|False|None)\b|\b(print|len|range|str|int|float|list|dict|set|tuple|open|super|self)\b|([A-Za-z_]\w*)(?=\s*\()/g;
  var HTML_TOKEN = /(<!--[\s\S]*?-->)|(<\/?[a-zA-Z][^>]*?>)/g;

  /* Walk raw source with a global token regex, escaping plain text
     and letting classify() wrap each match (already escaped). */
  function highlightWith(src, pattern, classify) {
    var flags = pattern.flags.indexOf("g") === -1 ? pattern.flags + "g" : pattern.flags;
    var re = new RegExp(pattern.source, flags);
    var out = "", last = 0, m;
    while ((m = re.exec(src)) !== null) {
      out += LSR.escapeHtml(src.slice(last, m.index));
      out += classify(m);
      last = m.index + m[0].length;
      if (m[0] === "") re.lastIndex++;
    }
    out += LSR.escapeHtml(src.slice(last));
    return out;
  }

  function spanCls(cls, raw) {
    return '<span class="' + cls + '">' + LSR.escapeHtml(raw) + "</span>";
  }

  function highlightJS(src) {
    return highlightWith(src, JS_TOKEN, function (m) {
      if (m[1]) return spanCls("tok-com", m[0]);
      if (m[2]) return spanCls("tok-str", m[0]);
      if (m[3]) return spanCls("tok-num", m[0]);
      if (m[4]) return spanCls("tok-kw", m[0]);
      if (m[5]) return spanCls("tok-op", m[0]);
      if (m[6]) return spanCls("tok-fn", m[0]);
      return LSR.escapeHtml(m[0]);
    });
  }

  function highlightPY(src) {
    return highlightWith(src, PY_TOKEN, function (m) {
      if (m[1]) return spanCls("tok-com", m[0]);
      if (m[2]) return spanCls("tok-str", m[0]);
      if (m[3]) return spanCls("tok-num", m[0]);
      if (m[4]) return spanCls("tok-kw", m[0]);
      if (m[5]) return spanCls("tok-op", m[0]);
      if (m[6]) return spanCls("tok-fn", m[0]);
      return LSR.escapeHtml(m[0]);
    });
  }

  function highlightHTML(src) {
    return highlightWith(src, HTML_TOKEN, function (m) {
      if (m[1]) return spanCls("tok-com", m[0]); // <!-- comment -->
      var esc = LSR.escapeHtml(m[2]); // &lt;div class=&quot;a&quot;&gt;
      return esc.replace(/(&lt;\/?)([a-zA-Z][\w-]*)|([\w-]+)(?=\s*=)|(&quot;(?:(?!&quot;).)*?&quot;|'[^']*')|(\/?&gt;)/g,
        function (t, open, tagName, attr, aval, close) {
          if (tagName) return open + spanCls("tok-tag", tagName);
          if (attr) return spanCls("tok-attr", attr);
          if (aval) return spanCls("tok-str", aval);
          if (close) return spanCls("tok-tag", close);
          return t;
        });
    });
  }

  function refreshHighlight() {
    var f = activeFile();
    var src = els.input.value;
    var html;
    if (!f || f.lang === "javascript") html = highlightJS(src);
    else if (f.lang === "python") html = highlightPY(src);
    else html = highlightHTML(src);
    els.hl.innerHTML = html + "\n";
    var lines = src.split("\n").length;
    var g = "";
    for (var i = 1; i <= lines; i++) g += i + "\n";
    els.gutter.textContent = g;
    syncScroll();
  }

  /* ---------- run JavaScript ---------- */

  function fmtVal(v) {
    if (typeof v === "string") return v;
    if (v === undefined) return "undefined";
    try {
      var s = JSON.stringify(v, null, 2);
      return s === undefined ? String(v) : s;
    } catch (e) { return String(v); }
  }

  function runCode() {
    var f = activeFile();
    if (!f) return;
    if (f.lang !== "javascript") {
      els.output.innerHTML = '<span class="log-err">Run is available for JavaScript files only. ' +
        'This file is ' + LSR.escapeHtml((LANGS[f.lang] || {}).label || f.lang) + ".</span>";
      LSR.toast("Run supports JavaScript files", "info");
      return;
    }
    var logs = [];
    var fakeConsole = {
      log: function () { logs.push({ t: "log", v: Array.from(arguments).map(fmtVal).join(" ") }); },
      info: function () { logs.push({ t: "log", v: Array.from(arguments).map(fmtVal).join(" ") }); },
      warn: function () { logs.push({ t: "warn", v: Array.from(arguments).map(fmtVal).join(" ") }); },
      error: function () { logs.push({ t: "err", v: Array.from(arguments).map(fmtVal).join(" ") }); }
    };
    var started = performance.now();
    try {
      // Indirect eval in a function scope; console is shadowed.
      new Function("console", '"use strict";\n' + f.content)(fakeConsole);
      logs.push({ t: "ok", v: "✓ Finished in " + Math.round(performance.now() - started) + " ms" });
    } catch (err) {
      logs.push({ t: "err", v: "✕ " + (err && err.stack ? err.stack.split("\n").slice(0, 3).join("\n") : String(err)) });
    }
    els.output.innerHTML = "";
    if (!logs.length) {
      els.output.innerHTML = '<span class="log-dim">// No output. Use console.log(…) to print.</span>';
      return;
    }
    logs.forEach(function (l) {
      var div = document.createElement("div");
      div.className = l.t === "err" ? "log-err" : l.t === "ok" ? "log-ok" : "";
      div.textContent = l.v;
      els.output.appendChild(div);
    });
  }

  /* ---------- AI side panel ---------- */

  function stopAiStream() {
    if (aiStreaming) { try { aiStreaming.abort(); } catch (e) {} aiStreaming = null; }
  }

  function aiAction(kind) {
    var f = activeFile();
    if (!f) return;
    var promptText = els.aiPrompt.value.trim();

    if (kind === "generate" && !promptText) {
      LSR.toast("Describe the code to generate first.", "info");
      els.aiPrompt.focus();
      return;
    }
    if ((kind === "explain" || kind === "debug") && !f.content.trim()) {
      LSR.toast("The active file is empty.", "info");
      return;
    }
    if (LSR.state.settings.activeModel === "live" && !LSR.api.liveReady()) {
      LSR.toast("Live mode needs API settings first.", "error");
      LSR.switchModule("settings");
      return;
    }

    stopAiStream();
    els.aiResult.innerHTML = '<span class="stream-cursor" style="color:var(--muted)">Thinking…</span>';
    els.aiResultActions.innerHTML = "";

    var controller = new AbortController();
    var full = "";
    aiStreaming = { abort: function () { try { controller.abort(); } catch (e) {} } };

    var prompt = kind === "generate"
      ? promptText
      : kind === "explain"
        ? "Explain this " + f.lang + " code:\n\n" + f.content
        : "Find bugs in this " + f.lang + " code:\n\n" + f.content;

    var label = kind === "generate" ? "Generated code" : kind === "explain" ? "Explanation" : "Bug report";

    LSR.api.complete(kind, prompt, {
      code: f.content,
      lang: f.lang,
      signal: controller.signal,
      onToken: function (chunk) {
        full += chunk;
        els.aiResult.textContent = full;
      }
    }).then(function (result) {
      aiStreaming = null;
      var text = result !== undefined ? result : full;
      if (!text) {
        els.aiResult.innerHTML = '<span style="color:var(--muted-2)">No output.</span>';
        return;
      }
      els.aiResult.innerHTML = LSR.renderMarkdown(text);
      els.aiResult.dataset.raw = text;
      renderAiActions(kind, label);
      if (kind === "generate") els.aiPrompt.value = "";
    }).catch(function (err) {
      aiStreaming = null;
      if (err && err.name === "AbortError") {
        els.aiResult.innerHTML = '<span style="color:var(--muted-2)">Stopped.</span>';
        return;
      }
      els.aiResult.innerHTML = "";
      LSR.toast("AI request failed: " + (err && err.message ? err.message : err), "error");
    });
  }

  function extractCodeBlocks(text) {
    var blocks = [];
    text.replace(/```\w*\n([\s\S]*?)(?:```|$)/g, function (_, code) {
      blocks.push(code.replace(/\n$/, ""));
      return "";
    });
    return blocks;
  }

  function renderAiActions(kind, label) {
    els.aiResultActions.innerHTML = "";
    if (kind === "generate") {
      var insert = document.createElement("button");
      insert.className = "btn btn-sm btn-primary";
      insert.textContent = "Insert into editor";
      insert.addEventListener("click", function () {
        var raw = els.aiResult.dataset.raw || "";
        var blocks = extractCodeBlocks(raw);
        var snippet = blocks.length ? blocks.join("\n\n") : raw;
        var ta = els.input;
        var start = ta.selectionStart, end = ta.selectionEnd;
        ta.value = ta.value.slice(0, start) + snippet + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = start + snippet.length;
        onEdit();
        ta.focus();
        LSR.toast(label + " inserted", "success");
      });
      els.aiResultActions.appendChild(insert);
    }
    var clear = document.createElement("button");
    clear.className = "btn btn-sm btn-ghost";
    clear.textContent = "Clear";
    clear.addEventListener("click", function () {
      stopAiStream();
      els.aiResult.innerHTML = "";
      els.aiResultActions.innerHTML = "";
    });
    els.aiResultActions.appendChild(clear);
  }

  window.LSR = window.LSR || {};
  LSR.codelab = {
    init: init,
    activeFile: activeFile,
    activateFile: activateFile,
    // exposed for tests
    _highlight: { js: highlightJS, py: highlightPY, html: highlightHTML },
    _runSandbox: null
  };
})();
