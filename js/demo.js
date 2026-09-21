/* ============================================================
   LSR AI STUDIO — js/demo.js
   Demo-mode response engine. Pure functions: given a prompt
   (and optional code context), produce a useful markdown answer.
   The chat layer streams the text in chunks for effect.
   ============================================================ */
(function () {
  "use strict";

  var CODE_SAMPLES = {
    fibonacci: {
      js: "function fibonacci(n) {\n  if (n < 2) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\n// iterative version (much faster)\nfunction fibFast(n) {\n  let a = 0, b = 1;\n  for (let i = 0; i < n; i++) [a, b] = [b, a + b];\n  return a;\n}\n\nconsole.log(fibFast(10)); // 55",
      py: "def fibonacci(n):\n    \"\"\"Return the n-th Fibonacci number (iterative).\"\"\"\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint(fibonacci(10))  # 55"
    },
    sort: {
      js: "function quickSort(arr) {\n  if (arr.length <= 1) return arr;\n  const pivot = arr[Math.floor(arr.length / 2)];\n  const left = arr.filter(x => x < pivot);\n  const mid = arr.filter(x => x === pivot);\n  const right = arr.filter(x => x > pivot);\n  return [...quickSort(left), ...mid, ...quickSort(right)];\n}\n\nconsole.log(quickSort([3, 6, 1, 8, 2, 5])); // [1, 2, 3, 5, 6, 8]",
      py: "def quick_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    mid = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quick_sort(left) + mid + quick_sort(right)\n\nprint(quick_sort([3, 6, 1, 8, 2, 5]))  # [1, 2, 3, 5, 6, 8]"
    },
    fetch: {
      js: "async function getUser(id) {\n  try {\n    const res = await fetch(`https://api.example.com/users/${id}`);\n    if (!res.ok) throw new Error(`HTTP ${res.status}`);\n    const user = await res.json();\n    console.log(user);\n    return user;\n  } catch (err) {\n    console.error(\"Request failed:\", err.message);\n  }\n}\n\ngetUser(1);",
      py: "import urllib.request, json\n\ndef get_user(user_id):\n    url = f\"https://api.example.com/users/{user_id}\"\n    try:\n        with urllib.request.urlopen(url) as res:\n            user = json.load(res)\n            print(user)\n            return user\n    except Exception as err:\n        print(\"Request failed:\", err)\n\nget_user(1)"
    },
    todo: {
      html: "<!DOCTYPE html>\n<html>\n<head><title>Todo</title></head>\n<body>\n  <input id=\"task\" placeholder=\"New task…\">\n  <button onclick=\"addTask()\">Add</button>\n  <ul id=\"list\"></ul>\n  <script>\n    function addTask() {\n      const input = document.getElementById('task');\n      if (!input.value.trim()) return;\n      const li = document.createElement('li');\n      li.textContent = input.value;\n      li.onclick = () => li.remove();\n      document.getElementById('list').appendChild(li);\n      input.value = '';\n    }\n  </script>\n</body>\n</html>"
    }
  };

  function hasWord(text, words) {
    return words.some(function (w) { return text.indexOf(w) !== -1; });
  }

  function detectLang(prompt) {
    if (/\bpython\b|\bpy\b/.test(prompt)) return "python";
    if (/\bhtml\b/.test(prompt)) return "html";
    return "javascript";
  }

  function langLabel(lang) {
    return lang === "python" ? "Python" : lang === "html" ? "HTML" : "JavaScript";
  }

  function generateResponse(prompt) {
    var p = " " + prompt.toLowerCase().trim() + " ";

    // 1. Greetings
    if (/^(hi|hello|hey|yo|sup|good (morning|afternoon|evening)|namaste)\b/.test(p.trim())) {
      return "Hey! I'm **LSR AI Studio** — your all-in-one AI workspace and a companion to **Jarvis** by LSR.AI.\n\nHere's what I can do right now:\n\n- **Chat** — ask questions, brainstorm, get explanations (that's this!)\n- **Code Lab** — write code with syntax highlighting, AI explain/debug/generate, and one-click Run for JavaScript\n- **Automations** — schedule recurring prompts with cron expressions\n- **Models** — browse the open models this studio is built around\n\nTry asking me to *write a fibonacci function*, *explain closures*, or *debug some code*. What would you like to explore first?";
    }

    // 2. Identity
    if (hasWord(p, ["who are you", "your name", "what are you"])) {
      return "I'm **LSR AI Studio**, a demo AI workspace running **100% in your browser** — no servers, no API keys needed in Demo mode.\n\nI'm designed as a companion to **Jarvis — Your AI workspace** by LSR.AI. Flip the top-bar picker to **Live** and add an OpenAI-compatible endpoint in Settings, and I'll stream real model completions instead of these built-in demo answers.";
    }

    // 3. Code requests
    if (hasWord(p, ["fibonacci", "fib("])) {
      var lang = detectLang(p);
      var sample = CODE_SAMPLES.fibonacci[lang === "html" ? "js" : lang] || CODE_SAMPLES.fibonacci.js;
      return "Here's a Fibonacci implementation in **" + langLabel(lang === "html" ? "javascript" : lang) + "** — both the classic recursive version and the fast iterative one:\n\n```" + (lang === "html" ? "javascript" : lang) + "\n" + sample + "\n```\n\n**Why two versions?**\n\n- The recursive version is elegant but runs in *O(2ⁿ)* time — slow past n ≈ 40.\n- The iterative version is *O(n)* and handles large n easily.\n\nWant me to walk through how the iterative version works, or convert it to another language?";
    }
    if (hasWord(p, ["sort", "quicksort", "bubble sort"])) {
      var lang2 = detectLang(p);
      var s2 = CODE_SAMPLES.sort[lang2 === "html" ? "js" : lang2] || CODE_SAMPLES.sort.js;
      return "Here's **quicksort** in **" + langLabel(lang2 === "html" ? "javascript" : lang2) + "**:\n\n```" + (lang2 === "html" ? "javascript" : lang2) + "\n" + s2 + "\n```\n\n**How it works:**\n\n1. Pick a **pivot** element\n2. **Partition** the array into smaller / equal / larger\n3. **Recurse** on each partition\n\nAverage time complexity is *O(n log n)*. Want the in-place version or a different algorithm like merge sort?";
    }
    if (hasWord(p, ["fetch", "api call", "http request", "rest api"])) {
      var lang3 = detectLang(p);
      var s3 = CODE_SAMPLES.fetch[lang3 === "html" ? "js" : lang3] || CODE_SAMPLES.fetch.js;
      return "Here's how to make an HTTP request in **" + langLabel(lang3 === "html" ? "javascript" : lang3) + "** with proper error handling:\n\n```" + (lang3 === "html" ? "javascript" : lang3) + "\n" + s3 + "\n```\n\n**Key points:**\n\n- Always check `res.ok` — `fetch` only rejects on *network* failures, not HTTP errors\n- Wrap in `try/catch` for robustness\n- Parse with `.json()` for JSON APIs\n\nWant a POST example with headers and a JSON body?";
    }
    if (hasWord(p, ["todo", "to-do", "task list", "task app"])) {
      return "Here's a minimal **todo app** in a single HTML file — click a task to delete it:\n\n```html\n" + CODE_SAMPLES.todo.html + "\n```\n\n**Ideas to extend it:**\n\n- Persist tasks with `localStorage`\n- Add a \"done\" checkbox state\n- Split the script into its own `.js` file\n\nWant any of these added?";
    }
    // 4. Explanations (placed before the generic code branch
    // so "what is a closure" explains instead of templating)
    var explainM = p.match(/(?:explain|what is|what are|what does|how does|how do|tell me about)\s+(.+)/);
    if (explainM) {
      var topic = explainM[1].replace(/[?.!]+$/, "").trim();
      return "## " + capitalize(topic) + "\n\nHere's the core idea, stripped of jargon:\n\n**In one sentence:** " + capitalize(topic) + " is best understood by seeing what problem it solves and how it behaves in practice — not by memorizing a definition.\n\n**The mental model:**\n\n- Think of it as a *tool with a contract*: given certain inputs, it guarantees certain outputs.\n- The details matter less than the **boundaries** — what it promises, and what it doesn't.\n\n**How to go deeper:**\n\n1. Find one concrete example and trace it end-to-end\n2. Change one variable and observe what breaks\n3. Teach it back in your own words\n\nIf you give me a specific topic — like *\"explain closures in JavaScript\"* or *\"what is a vector database\"* — I'll give you a proper deep-dive with code. What exactly should I unpack?";
    }

    // 5. Generic code requests
    if (hasWord(p, ["write code", "write a", "code for", "function", "script", "program", "implement"])) {
      var lang4 = detectLang(p);
      var ll = lang4 === "html" ? "javascript" : lang4;
      return "Here's a clean starter template in **" + langLabel(ll) + "** you can build on:\n\n```" + ll + "\n" + starterTemplate(ll) + "\n```\n\nTell me more specifically what you want the code to *do* — e.g. \"a debounce function\", \"a python web scraper\", or \"an HTML landing page\" — and I'll write the real thing.";
    }

    // 6. Debugging help
    if (hasWord(p, ["debug", "bug", "error", "fix", "not working", "broken", "exception"])) {
      return "Let's debug this together. Here's my systematic approach:\n\n**1. Read the error literally**\n\n- The message usually names the *what*; the stack trace names the *where*. Start at the top frame that's *your* code.\n\n**2. Reproduce minimally**\n\n- Strip the code down to the smallest snippet that still fails. Half of all bugs become obvious at this step.\n\n**3. Check the usual suspects**\n\n- `undefined` / `null` values (log them right before the crash)\n- Async timing — is the data actually loaded when you use it?\n- Off-by-one errors in loops and indexes\n- Typos in property names\n\n**4. Bisect**\n\n- Comment out half the code. Still broken? The bug is in the remaining half. Repeat.\n\nPaste your code (or drop it in **Code Lab** and hit *Find bugs*) and I'll take a direct look.";
    }

    // 7. Thanks / bye
    if (hasWord(p, ["thank", "thanks", "thx", "great", "awesome", "nice"])) {
      return "You're welcome! Happy to help anytime.\n\nIf you want to keep building: try the **Code Lab** for hands-on code with AI assistance, or set up a recurring prompt in **Automations**. What next?";
    }
    if (hasWord(p, ["bye", "goodbye", "see you", "good night"])) {
      return "Goodbye for now! Your conversations are saved locally, so they'll be here when you get back. 👋";
    }

    // 8. Fallback — reflective, structured, genuinely useful
    var short = prompt.length > 90 ? prompt.slice(0, 90) + "…" : prompt;
    return "Interesting — you're asking about **\" " + short.trim() + " \"**.\n\nHere's how I'd break that down:\n\n**1. Clarify the goal**\n\n- What does *done* look like for this? A one-line answer, a working snippet, or a full explanation?\n\n**2. The key angles**\n\n- *Concept* — the underlying idea in plain language\n- *Practice* — how it's actually used, with a concrete example\n- *Pitfalls* — the mistakes everyone makes the first time\n\n**3. My suggestion**\n\n- Give me one more detail — e.g. \"explain it with a JavaScript example\" or \"write the code for it\" — and I'll go deep.\n\n*(Demo mode: these are built-in smart templates. Connect a Live API in Settings for full open-ended answers.)*";
  }

  function starterTemplate(lang) {
    if (lang === "python") {
      return "def main():\n    \"\"\"Entry point — describe what this should do.\"\"\"\n    data = [3, 1, 4, 1, 5, 9]\n    result = process(data)\n    print(result)\n\n\ndef process(items):\n    # TODO: implement your logic here\n    return sorted(items)\n\n\nif __name__ == \"__main__\":\n    main()";
    }
    return "// Describe what this should do, then ask me to fill it in.\nfunction main() {\n  const data = [3, 1, 4, 1, 5, 9];\n  const result = process(data);\n  console.log(result);\n}\n\nfunction process(items) {\n  // TODO: implement your logic here\n  return [...items].sort((a, b) => a - b);\n}\n\nmain();";
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  /* ---- Code Lab helpers ---- */

  function explainCode(code, lang) {
    var lines = code.split("\n").length;
    var label = langLabel(lang === "html" ? "html" : lang);
    var notes = [];
    if (/function\s+\w+|=>|def\s+\w+/.test(code)) notes.push("It defines **reusable functions** — named blocks of logic you can call with different inputs.");
    if (/for\s*\(|while\s*\(|for\s+\w+\s+in/.test(code)) notes.push("It uses **loops** to repeat work over a collection or a range.");
    if (/if\s*\(|if\s+\w/.test(code)) notes.push("It branches with **conditionals** (`if`/`else`) to handle different cases.");
    if (/console\.log|print\(/.test(code)) notes.push("It **outputs** values so you can observe what the program is doing.");
    if (/fetch|await|async/.test(code)) notes.push("It does **asynchronous work** (`async`/`await` or fetch) — operations that take time without blocking.");
    if (!notes.length) notes.push("It's mostly straight-line code: declarations and expressions executed top to bottom.");
    return "## Code explanation (" + label + ", " + lines + " lines)\n\nHere's what this file does:\n\n" +
      notes.map(function (n, i) { return (i + 1) + ". " + n; }).join("\n") +
      "\n\n**Reading tip:** start from the *entry point* (the last lines that actually execute), then drill into each function it calls. Want me to annotate it line-by-line or suggest improvements?";
  }

  function findBugs(code, lang) {
    var issues = [];
    if (/==(?!=)/.test(code) && lang === "javascript") issues.push("**`==` instead of `===`** — loose equality coerces types (`0 == \"\"` is true). Prefer strict `===` unless coercion is intentional.");
    if (/var\s+\w+/.test(code)) issues.push("**`var` declarations** — function-scoped and hoisted; `let`/`const` are safer and block-scoped.");
    if (/console\.log/.test(code)) issues.push("**Leftover `console.log` calls** — fine while debugging, but remove or gate them before shipping.");
    if (/eval\s*\(/.test(code)) issues.push("**`eval()` usage** — a security risk and performance killer. There is almost always a better way.");
    if (/TODO|FIXME|XXX/.test(code)) issues.push("**Unresolved TODO/FIXME markers** — track these so they don't rot.");
    if (code.indexOf("catch") === -1 && /fetch|JSON\.parse|await/.test(code)) issues.push("**Missing error handling** — async work and parsing can throw; wrap in `try/catch`.");
    if (!issues.length) issues.push("No obvious red flags from a static skim — no `eval`, no loose equality, no missing error handling around async calls.");
    return "## Bug scan (" + langLabel(lang === "html" ? "html" : lang) + ")\n\n" +
      issues.map(function (n, i) { return (i + 1) + ". " + n; }).join("\n\n") +
      "\n\n*Static heuristics only — I can't run Python/HTML here, but **Run** executes JavaScript live. Paste a stack trace and I'll pinpoint it.*";
  }

  function generateCode(prompt, lang) {
    var p = " " + prompt.toLowerCase() + " ";
    var ll = lang === "html" ? "html" : lang;
    var body;
    if (hasWord(p, ["fibonacci"])) body = CODE_SAMPLES.fibonacci[ll === "python" ? "py" : "js"];
    else if (hasWord(p, ["sort"])) body = CODE_SAMPLES.sort[ll === "python" ? "py" : "js"];
    else if (hasWord(p, ["fetch", "api", "http"])) body = CODE_SAMPLES.fetch[ll === "python" ? "py" : "js"];
    else if (hasWord(p, ["todo", "task list"])) body = CODE_SAMPLES.todo.html;
    else body = starterTemplate(ll === "python" ? "python" : "javascript");
    var fence = ll === "python" ? "python" : ll === "html" ? "html" : "javascript";
    return "Here's generated **" + langLabel(ll) + "** for: *\"" + prompt.slice(0, 80) + "\"*\n\n```" + fence + "\n" + body + "\n```\n\nUse **Insert into editor** to drop the code into your file, then tweak it. Want a different approach or more features?";
  }

  /* Async chunk streamer — yields the text in small pieces */
  async function* streamText(text, signal, chunkSize) {
    chunkSize = chunkSize || 6;
    var i = 0;
    while (i < text.length) {
      if (signal && signal.aborted) return;
      yield text.slice(i, i + chunkSize);
      i += chunkSize;
      await new Promise(function (r) { setTimeout(r, 14); });
    }
  }

  window.LSR = window.LSR || {};
  LSR.demo = {
    generateResponse: generateResponse,
    explainCode: explainCode,
    findBugs: findBugs,
    generateCode: generateCode,
    streamText: streamText
  };
})();
