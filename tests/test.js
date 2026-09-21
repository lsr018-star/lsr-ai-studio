/* ============================================================
   LSR AI STUDIO — DOM-less test harness (node)
   Loads the pure layers (state catalog, markdown, demo, api,
   automations cron, codelab highlighters, sites builders) with
   a minimal `window` shim and asserts behaviour. No DOM, no
   network.
   Run: node tests/test.js
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

// Minimal browser shim: in a real browser `window` IS the global object,
// so `window.LSR = x` makes bare `LSR` resolve. Mirror that here.
// Files only touch window + localStorage (guarded by try/catch).
global.window = global;

function load(rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
  // Indirect eval so IIFEs run in global scope like classic <script> tags.
  (0, eval)(code);
}

["js/state.js", "js/markdown.js", "js/demo.js", "js/api.js",
 "js/automations.js", "js/codelab.js", "js/sites.js"].forEach(load);

const LSR = global.window.LSR;

let pass = 0, fail = 0;
function assert(cond, name) {
  if (cond) { pass++; }
  else { fail++; console.error("FAIL:", name); }
}
function eq(a, b, name) { assert(a === b, name + " (got " + JSON.stringify(a) + ")"); }

/* ---------------- markdown ---------------- */
(function () {
  const r = LSR.renderMarkdown;
  assert(/<h1>Hi<\/h1>/.test(r("# Hi")), "md: h1");
  assert(/<h3>T<\/h3>/.test(r("### T")), "md: h3");
  assert(/<strong>bold<\/strong>/.test(r("**bold**")), "md: bold");
  assert(/<em>it<\/em>/.test(r("*it*")), "md: italic");
  assert(/<code class="inline">x<\/code>/.test(r("`x`")), "md: inline code");
  assert(/<a href="https:\/\/a\.b" target="_blank" rel="noopener">L<\/a>/.test(r("[L](https://a.b)")), "md: link");
  const img = r("![a pic](https://img.test/x.png)");
  assert(/<img src="https:\/\/img\.test\/x\.png" alt="a pic" loading="lazy">/.test(img), "md: image");
  assert(!/<a href/.test(img), "md: image not parsed as link");
  const cb = r("```js\nvar a = 1;\n```");
  assert(cb.includes('class="codeblock"') && cb.includes("data-copy-idx=\"0\""), "md: codeblock wrapper + copy idx");
  eq(LSR.getRenderedCode(0), "var a = 1;", "md: getRenderedCode");
  const ul = r("- a\n- b");
  assert(ul.includes("<ul>") && (ul.match(/<li>/g) || []).length === 2, "md: unordered list");
  const ol = r("1. a\n2. b");
  assert(ol.includes("<ol>"), "md: ordered list");
  assert(/<blockquote>q<\/blockquote>/.test(r("> q")), "md: blockquote");
  const tbl = r("| a | b |\n|---|---|\n| 1 | 2 |");
  assert(tbl.includes("<table>") && tbl.includes("<td>1</td>") && !tbl.includes("---"), "md: table, separator skipped");
  assert(/<hr>/.test(r("---")), "md: hr");
  const xss = r("<script>alert(1)</script>");
  assert(!xss.includes("<script>alert"), "md: script tag escaped");
  assert(xss.includes("&lt;script&gt;"), "md: escape entities");
})();

/* ---------------- demo ---------------- */
(function () {
  const d = LSR.demo;
  assert(d.generateResponse("hello").includes("LSR AI Studio"), "demo: greeting");
  assert(/```/.test(d.generateResponse("write a fibonacci function")), "demo: fibonacci fence");
  assert(d.explainCode("function f(){ return 1; }", "javascript").includes("functions"), "demo: explain mentions functions");
  assert(d.findBugs("if (a == b) {}", "javascript").includes("==="), "demo: findBugs ==");
  assert(/```/.test(d.generateCode("fibonacci", "javascript")), "demo: generateCode fence");
  assert(d.generateResponse("blargh xyz").includes("Demo mode"), "demo: fallback mentions demo");
})();

/* ---------------- providers / state ---------------- */
(function () {
  eq(LSR.PROVIDERS.length, 5, "providers: catalog has 5");
  const p0 = LSR.PROVIDERS[0];
  eq(p0.id, "pollinations", "providers: pollinations is default-first");
  eq(p0.needsKey, false, "providers: pollinations needs no key");
  eq(p0.base, "https://text.pollinations.ai/openai", "providers: pollinations base");
  eq(p0.model, "openai-fast", "providers: pollinations model");
  assert(LSR.PROVIDERS.some(p => p.id === "openrouter" && p.needsKey), "providers: openrouter needs key");
  assert(LSR.PROVIDERS.some(p => p.id === "gemini" && p.base.includes("googleapis")), "providers: gemini base");
  assert(LSR.PROVIDERS.some(p => p.id === "groq"), "providers: groq present");
  assert(LSR.PROVIDERS.some(p => p.id === "custom"), "providers: custom present");

  const dp = LSR.defaultProviders();
  assert(["pollinations", "openrouter", "gemini", "groq", "custom"].every(k => dp[k]), "providers: defaults have all 5");

  // legacy migration
  const mig = LSR.migrateLegacySettings({ apiBase: "https://x.test/v1", apiKey: "k", model: "m" });
  eq(mig.providerId, "custom", "migrate: providerId=custom");
  eq(mig.providers.custom.base, "https://x.test/v1", "migrate: base preserved");
  eq(mig.providers.custom.key, "k", "migrate: key preserved");
  eq(mig.providers.custom.model, "m", "migrate: model preserved");
  assert(!("apiBase" in mig), "migrate: legacy keys removed");
  const migEmpty = LSR.migrateLegacySettings({});
  assert(!migEmpty.providerId, "migrate: empty stays empty");

  // liveReady matrix against fresh default settings
  const api = LSR.api;
  LSR.state.settings.providerId = "pollinations";
  LSR.state.settings.providers = LSR.defaultProviders();
  assert(api.liveReady(), "liveReady: pollinations without key");
  LSR.state.settings.providerId = "custom";
  assert(!api.liveReady(), "liveReady: custom empty not ready");
  LSR.state.settings.providers.custom = { base: "http://localhost:4000", model: "m", key: "k" };
  assert(api.liveReady(), "liveReady: custom complete ready");
  LSR.state.settings.providerId = "openrouter";
  assert(!api.liveReady(), "liveReady: openrouter without key not ready");
  LSR.state.settings.providers.openrouter.key = "free-key";
  assert(api.liveReady(), "liveReady: openrouter with key ready");
  // activeProvider reflects stored overrides
  const cfg = api.providerConfig("pollinations");
  eq(cfg.base, "https://text.pollinations.ai/openai", "providerConfig: pollinations base");
  eq(cfg.key, "", "providerConfig: empty key default");
})();

/* ---------------- api pure helpers ---------------- */
(function () {
  const api = LSR.api;
  const noKey = { base: "https://text.pollinations.ai/openai/", model: "openai-fast", key: "" };
  const withKey = { base: "https://api.groq.com/openai/v1", model: "m", key: "sekret" };

  const r1 = api.buildChatRequest(noKey, [{ role: "user", content: "hi" }], true);
  eq(r1.url, "https://text.pollinations.ai/openai/chat/completions", "api: url join strips trailing slash");
  assert(!("Authorization" in r1.headers), "api: no auth header without key");
  eq(r1.headers["Content-Type"], "application/json", "api: content-type");
  eq(r1.body.model, "openai-fast", "api: body model");
  eq(r1.body.stream, true, "api: body stream");
  eq(r1.body.messages.length, 1, "api: body messages");

  const r2 = api.buildChatRequest(withKey, [], false);
  eq(r2.headers["Authorization"], "Bearer sekret", "api: auth header with key");
  eq(r2.body.stream, false, "api: non-stream body");

  const sse = api.parseSSEData('{"choices":[{"delta":{"content":"Hello"}}]}');
  eq(sse, "Hello", "api: SSE delta parse");
  eq(api.parseSSEData("[DONE]"), "", "api: SSE [DONE]");
  eq(api.parseSSEData("not json{{{"), "", "api: SSE malformed");
  eq(api.parseSSEData('{"choices":[]}'), "", "api: SSE empty choices");
  eq(api.parseSSEData('{"choices":[{"delta":{}}]}'), "", "api: SSE no content");
})();

/* ---------------- automations cron ---------------- */
(function () {
  const v = LSR.automations._validCron;
  assert(v("0 9 * * *"), "cron: daily valid");
  assert(v("*/15 * * * *"), "cron: step valid");
  assert(v("0 0 1,15 * 1-5"), "cron: lists/ranges valid");
  assert(!v("not a cron"), "cron: words invalid");
  assert(!v("0 9 * *"), "cron: 4 fields invalid");
  assert(!v("0 9 * * * *"), "cron: 6 fields invalid");
  assert(!v(""), "cron: empty invalid");
})();

/* ---------------- codelab highlighters ---------------- */
(function () {
  const h = LSR.codelab._highlight;
  assert(h.js("const x = 1;").includes('<span class="tok-kw">const</span>'), "hl: js keyword");
  assert(h.js('var s = "hi";').includes('<span class="tok-str">&quot;hi&quot;</span>'), "hl: js string");
  assert(h.js("// c\nx();").includes("tok-com"), "hl: js comment");
  assert(h.py("def f():\n    return 1").includes('<span class="tok-kw">def</span>'), "hl: py keyword");
  assert(h.html('<div class="a">x</div>').includes("tok-tag"), "hl: html tag");
  // escaping: raw < must not leak through highlighter
  assert(!h.js("a < b").includes("< b"), "hl: js escapes <");
})();

/* ---------------- sites ---------------- */
(function () {
  const s = LSR.sites;
  eq(s.templates.length, 5, "sites: 5 templates");
  assert(["business", "portfolio", "restaurant", "agency", "comingsoon"].every(id => s._template(id).id === id), "sites: template ids");

  eq(s._slugify("Saffron & Smoke!"), "saffron-smoke", "sites: slugify");
  eq(s._slugify(""), "site", "sites: slugify empty");
  assert(s._parseLines("a\n\n b \n").join(",") === "a,b", "sites: parseLines");
  const pr = s._splitPair("Margherita Pizza — ₹345");
  eq(pr.title, "Margherita Pizza", "sites: splitPair title");
  eq(pr.desc, "₹345", "sites: splitPair desc");
  const pr2 = s._splitPair("Just a name");
  eq(pr2.desc, "", "sites: splitPair no desc");
  assert(s._esc('<b>"q"</b>').includes("&lt;b&gt;"), "sites: esc");
  eq(s._hexToRgba("#22d3ee", 0.5), "rgba(34,211,238,0.5)", "sites: hexToRgba");

  const ids = ["business", "portfolio", "restaurant", "agency", "comingsoon"];
  ids.forEach(id => {
    const cfg = s.defaultConfig(id);
    cfg.businessName = "TestCo";
    cfg.primary = "#ff0000";
    const html = s.buildSite(id, cfg);
    assert(html.startsWith("<!DOCTYPE html>"), "sites:" + id + " doctype");
    assert(html.includes("TestCo"), "sites:" + id + " business name");
    assert(html.includes("--primary:#ff0000"), "sites:" + id + " primary color var");
    assert(html.includes('name="viewport"'), "sites:" + id + " viewport");
    assert(html.includes("<style>") && html.includes("<script>"), "sites:" + id + " inline css+js");
    assert(html.includes("prefers-reduced-motion"), "sites:" + id + " reduced motion");
    assert(html.includes('id="menuBtn"'), "sites:" + id + " mobile menu");
    assert(html.includes("IntersectionObserver"), "sites:" + id + " scroll reveal");
    // No external *assets*: no remote scripts/images/stylesheets/fonts.
    // (User-typed social links in coming-soon are plain <a> links — user data, not dependencies.)
    assert(!/src="http/i.test(html), "sites:" + id + " no external src");
    assert(!/<link/i.test(html), "sites:" + id + " no external stylesheets");
    assert(!/url\(https?:/i.test(html), "sites:" + id + " no external css urls");
    assert(!/fonts\.googleapis/i.test(html), "sites:" + id + " no webfonts");
  });

  const rest = s.buildSite("restaurant", Object.assign(s.defaultConfig("restaurant"), { businessName: "R" }));
  assert(rest.includes("Margherita Pizza") || rest.includes("Smoked Butter Chicken"), "sites: restaurant menu items");
  const cs = s.buildSite("comingsoon", s.defaultConfig("comingsoon"));
  assert(cs.includes('id="cd"') && cs.includes("notifyGo"), "sites: comingsoon countdown+notify");
  const biz = s.buildSite("business", s.defaultConfig("business"));
  assert(biz.includes("Web design"), "sites: business services");
  const port = s.buildSite("portfolio", s.defaultConfig("portfolio"));
  assert(port.includes("Fintech dashboard"), "sites: portfolio projects");
  const ag = s.buildSite("agency", s.defaultConfig("agency"));
  assert(ag.includes("MVP builds"), "sites: agency services");
})();

console.log("\n" + pass + " passed, " + fail + " failed, " + (pass + fail) + " total");
process.exit(fail ? 1 : 0);
