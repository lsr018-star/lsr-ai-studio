/* ============================================================
   LSR AI STUDIO — js/sites.js
   Studio Sites: client-ready single-page website templates.
   Builders are pure functions (unit-testable) that emit one
   fully self-contained HTML file — inline CSS + JS, zero
   dependencies, no external requests. The module adds the
   gallery, customization panel, live iframe preview and
   one-click HTML export.
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- pure helpers ---------------- */

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseLines(text) {
    return String(text || "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
  }

  /* Split "Title — description" on a spaced dash (em/en/hyphen).
     Lines without a spaced dash become { title: line, desc: "" }. */
  function splitPair(line) {
    var m = String(line).match(/^(.*?)\s+[—–-]\s+(.*)$/);
    return m ? { title: m[1].trim(), desc: m[2].trim() } : { title: String(line).trim(), desc: "" };
  }

  function parsePairs(text) {
    return parseLines(text).map(splitPair);
  }

  function slugify(s) {
    return (String(s || "site").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)) || "site";
  }

  function hexToRgba(hex, alpha) {
    var h = String(hex || "#22d3ee").replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var r = parseInt(h.slice(0, 2), 16) || 34;
    var g = parseInt(h.slice(2, 4), 16) || 211;
    var b = parseInt(h.slice(4, 6), 16) || 238;
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  /* [[accent words]] inside a headline -> gradient span (escaped first). */
  function richTitle(s) {
    return esc(s).replace(/\[\[(.+?)\]\]/g, "<span class=\"grad\">$1</span>");
  }

  /* ---------------- shared page chrome ---------------- */

  function baseCSS(primary) {
    var soft = hexToRgba(primary, 0.12);
    var softer = hexToRgba(primary, 0.07);
    return "" +
    ":root{--primary:" + primary + ";--primary-soft:" + soft + ";" +
    "--bg:#070b16;--panel:#0d1324;--text:#eef2ff;--muted:#9aa6c7;--border:rgba(140,170,255,.14)}\n" +
    "*{box-sizing:border-box;margin:0}\n" +
    "html{scroll-behavior:smooth}\n" +
    "body{font-family:system-ui,-apple-system,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--text);line-height:1.65;overflow-x:hidden;-webkit-font-smoothing:antialiased}\n" +
    "img{max-width:100%}\n" +
    ".wrap{max-width:1120px;margin:0 auto}\n" +
    ".grad{background:linear-gradient(90deg,var(--primary),#a78bfa);-webkit-background-clip:text;background-clip:text;color:transparent}\n" +
    "/* nav */\n" +
    ".nav{position:sticky;top:0;z-index:50;background:rgba(7,11,22,.78);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--border)}\n" +
    ".nav-inner{max-width:1120px;margin:0 auto;display:flex;align-items:center;gap:14px;padding:13px 22px;position:relative}\n" +
    ".brand{font-weight:800;font-size:18px;letter-spacing:.4px;white-space:nowrap}\n" +
    ".brand em{font-style:normal;color:var(--primary)}\n" +
    ".nav-links{display:flex;gap:4px;margin-left:auto;align-items:center}\n" +
    ".nav-links a{color:var(--muted);text-decoration:none;font-size:14px;font-weight:600;padding:10px 14px;border-radius:9px;transition:all .15s}\n" +
    ".nav-links a:hover{color:var(--text);background:rgba(140,170,255,.09)}\n" +
    ".menu-btn{display:none;background:none;border:1px solid var(--border);border-radius:9px;width:44px;height:44px;cursor:pointer;flex-direction:column;align-items:center;justify-content:center;gap:5px;margin-left:auto}\n" +
    ".menu-btn span{display:block;width:20px;height:2px;background:var(--text);border-radius:2px}\n" +
    "/* hero */\n" +
    ".hero{position:relative;overflow:hidden;padding:110px 22px 96px;text-align:center}\n" +
    ".blob{position:absolute;border-radius:50%;filter:blur(90px);opacity:.45;pointer-events:none;animation:drift 16s ease-in-out infinite alternate}\n" +
    ".b1{width:480px;height:480px;left:-140px;top:-120px;background:" + primary + "}\n" +
    ".b2{width:420px;height:420px;right:-120px;top:10%;background:#a78bfa;animation-delay:-6s}\n" +
    ".b3{width:340px;height:340px;left:38%;bottom:-180px;background:#0ea5e9;animation-delay:-11s;opacity:.3}\n" +
    "@keyframes drift{from{transform:translate(0,0) scale(1)}to{transform:translate(60px,40px) scale(1.12)}}\n" +
    ".hero-inner{position:relative;max-width:840px;margin:0 auto}\n" +
    ".kicker{display:inline-block;font-size:12px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:var(--primary);background:" + soft + ";border:1px solid var(--border);padding:8px 18px;border-radius:999px;margin-bottom:22px}\n" +
    ".hero-title{font-size:clamp(34px,6vw,62px);line-height:1.12;font-weight:800;letter-spacing:-.5px}\n" +
    ".hero-sub{color:var(--muted);font-size:clamp(15px,2vw,18px);max-width:640px;margin:20px auto 32px}\n" +
    ".btn-row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}\n" +
    ".btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:13px 28px;border-radius:13px;font-weight:700;font-size:15px;text-decoration:none;cursor:pointer;border:1px solid transparent;transition:transform .18s,box-shadow .18s}\n" +
    ".btn-primary{background:linear-gradient(135deg,var(--primary),#a78bfa);color:#06121c;box-shadow:0 8px 28px " + softer + "}\n" +
    ".btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 34px " + soft + "}\n" +
    ".btn-ghost{border-color:var(--border);color:var(--text);background:rgba(140,170,255,.06)}\n" +
    ".btn-ghost:hover{border-color:var(--primary)}\n" +
    "/* sections */\n" +
    ".section{padding:88px 22px}\n" +
    ".sec-head{text-align:center;max-width:660px;margin:0 auto 48px}\n" +
    ".sec-kicker{color:var(--primary);text-transform:uppercase;letter-spacing:2.6px;font-size:12px;font-weight:800}\n" +
    ".sec-title{font-size:clamp(26px,4vw,38px);margin:12px 0 10px;letter-spacing:-.3px}\n" +
    ".sec-sub{color:var(--muted);font-size:15.5px}\n" +
    ".grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}\n" +
    ".card{background:var(--panel);border:1px solid var(--border);border-radius:17px;padding:28px;transition:transform .25s,border-color .25s,box-shadow .25s}\n" +
    ".card:hover{transform:translateY(-5px);border-color:var(--primary);box-shadow:0 16px 40px rgba(0,0,0,.35)}\n" +
    ".card h3{margin:0 0 8px;font-size:17.5px}\n" +
    ".card p{color:var(--muted);font-size:14.5px;margin:0}\n" +
    ".card .price{color:var(--primary);font-weight:800;font-size:19px}\n" +
    ".stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px}\n" +
    ".stat{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:24px 16px;text-align:center}\n" +
    ".stat b{display:block;font-size:34px;color:var(--primary);letter-spacing:-.5px}\n" +
    ".stat span{color:var(--muted);font-size:13.5px}\n" +
    ".t-quote{font-style:italic;color:var(--text);font-size:15px}\n" +
    ".t-name{margin-top:14px;color:var(--primary);font-weight:700;font-size:14px}\n" +
    ".t-role{color:var(--muted);font-size:12.5px}\n" +
    "/* work grid */\n" +
    ".w-thumb{height:150px;border-radius:12px;margin-bottom:16px;display:flex;align-items:flex-end;padding:14px;font-weight:800;font-size:15px;color:#06121c}\n" +
    "/* menu */\n" +
    ".menu-list{max-width:740px;margin:0 auto}\n" +
    ".menu-item{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:17px 4px;border-bottom:1px dashed var(--border)}\n" +
    ".menu-item .m-name{font-weight:700;font-size:16px}\n" +
    ".menu-item .m-desc{color:var(--muted);font-size:13.5px;margin-top:2px}\n" +
    ".menu-item .m-price{color:var(--primary);font-weight:800;font-size:17px;white-space:nowrap}\n" +
    "/* steps */\n" +
    ".steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}\n" +
    ".step{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:26px}\n" +
    ".step-num{display:inline-grid;place-items:center;width:42px;height:42px;border-radius:12px;background:" + soft + ";color:var(--primary);font-weight:800;font-size:17px;margin-bottom:14px}\n" +
    ".step h3{margin:0 0 6px;font-size:16px}\n.step p{color:var(--muted);font-size:14px;margin:0}\n" +
    "/* contact */\n" +
    ".contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}\n" +
    ".c-line{display:flex;gap:12px;align-items:center;margin-top:14px;color:var(--muted);font-size:14.5px}\n" +
    ".c-line b{color:var(--text);min-width:64px;flex:none}\n" +
    ".c-line span{min-width:0;overflow-wrap:anywhere}\n" +
    ".c-line a{color:var(--primary);text-decoration:none}\n" +
    "input,textarea{width:100%;padding:13px 15px;border-radius:11px;border:1px solid var(--border);background:#080d1a;color:var(--text);font-size:15px;font-family:inherit;margin-bottom:12px}\n" +
    "input:focus,textarea:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 1px var(--primary)}\n" +
    "textarea{min-height:110px;resize:vertical}\n" +
    "/* chips */\n" +
    ".chips{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}\n" +
    ".chip2{padding:10px 20px;border-radius:999px;background:" + soft + ";border:1px solid var(--border);font-size:14px;font-weight:600}\n" +
    "/* countdown */\n" +
    ".count{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin:34px 0}\n" +
    ".count>div{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:18px 22px;min-width:92px}\n" +
    ".count b{display:block;font-size:36px;color:var(--primary);letter-spacing:-1px}\n" +
    ".count span{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:2px}\n" +
    ".notify{max-width:480px;margin:0 auto}\n" +
    ".notify-ok{display:none;background:" + soft + ";border:1px solid var(--primary);border-radius:14px;padding:20px;text-align:center;font-weight:600}\n" +
    ".socials{display:flex;gap:10px;justify-content:center;margin-top:26px;flex-wrap:wrap}\n" +
    ".socials a{color:var(--muted);text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border:1px solid var(--border);border-radius:999px}\n" +
    ".socials a:hover{color:var(--primary);border-color:var(--primary)}\n" +
    "/* cta band */\n" +
    ".cta{background:linear-gradient(135deg," + softer + "," + soft + ");border:1px solid var(--border);border-radius:22px;padding:56px 32px;text-align:center;margin:0 22px}\n" +
    ".cta h2{font-size:clamp(24px,4vw,34px);margin-bottom:10px}\n" +
    ".cta p{color:var(--muted);max-width:520px;margin:0 auto 26px}\n" +
    "footer{border-top:1px solid var(--border);padding:36px 22px;text-align:center;color:var(--muted);font-size:13.5px}\n" +
    "footer b{color:var(--text)}\n" +
    "/* reveal */\n" +
    ".reveal{opacity:0;transform:translateY(26px);transition:opacity .7s ease,transform .7s ease}\n" +
    ".reveal.visible{opacity:1;transform:none}\n" +
    "@media(max-width:760px){\n" +
    " .menu-btn{display:inline-flex}\n" +
    " .nav-links{position:absolute;top:100%;left:0;right:0;flex-direction:column;align-items:stretch;background:rgba(7,11,22,.97);padding:10px 18px 20px;display:none;border-bottom:1px solid var(--border);margin:0}\n" +
    " .nav-links.open{display:flex}\n" +
    " .nav-links a{padding:13px 12px;font-size:15px}\n" +
    " .hero{padding:78px 18px 64px}\n" +
    " .section{padding:62px 18px}\n" +
    " .contact-grid{grid-template-columns:1fr}\n" +
    " .cta{margin:0 14px;padding:44px 22px}\n" +
    "}\n" +
    "@media (prefers-reduced-motion:reduce){\n" +
    " *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}\n" +
    " .reveal{opacity:1;transform:none}\n" +
    " html{scroll-behavior:auto}\n" +
    "}\n";
  }

  function baseJS() {
    return "(function(){\n" +
    "var btn=document.getElementById('menuBtn'),links=document.getElementById('navLinks');\n" +
    "if(btn&&links){btn.addEventListener('click',function(){var o=links.classList.toggle('open');btn.setAttribute('aria-expanded',o?'true':'false');});\n" +
    "links.addEventListener('click',function(e){if(e.target.tagName==='A')links.classList.remove('open');});}\n" +
    "var els=document.querySelectorAll('.reveal');\n" +
    "if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('visible');io.unobserve(en.target);}});},{threshold:.12});\n" +
    "els.forEach(function(el){io.observe(el);});}else{els.forEach(function(el){el.classList.add('visible');});}\n" +
    "var y=document.getElementById('year');if(y)y.textContent=new Date().getFullYear();\n" +
    "window.siteMail=function(f){var to=f.getAttribute('data-to')||'';\n" +
    "var url='mailto:'+to+'?subject='+encodeURIComponent('Website enquiry from '+(f.nm.value||'a visitor'))+'&body='+encodeURIComponent((f.msg.value||'')+'\\n\\n— '+(f.nm.value||'')+' ('+(f.em.value||'')+')');\n" +
    "window.location.href=url;return false;};\n" +
    "})();";
  }

  function navHTML(cfg, links, cta) {
    var items = (links || []).map(function (l) {
      return "<a href=\"" + esc(l.href) + "\">" + esc(l.label) + "</a>";
    }).join("");
    return "<header class=\"nav\"><div class=\"nav-inner\">" +
      "<div class=\"brand\">" + esc(cfg.businessName) + "</div>" +
      "<nav class=\"nav-links\" id=\"navLinks\" aria-label=\"Site navigation\">" + items + "</nav>" +
      (cta ? "<a class=\"btn btn-primary\" style=\"min-height:44px;padding:10px 20px;font-size:14px;margin-left:12px\" href=\"" + esc(cta.href) + "\">" + esc(cta.label) + "</a>" : "") +
      "<button class=\"menu-btn\" id=\"menuBtn\" aria-label=\"Open menu\" aria-expanded=\"false\"><span></span><span></span><span></span></button>" +
      "</div></header>";
  }

  function heroHTML(cfg, buttons) {
    var btns = (buttons || []).map(function (b) {
      return "<a class=\"btn " + (b.primary ? "btn-primary" : "btn-ghost") + "\" href=\"" + esc(b.href) + "\">" + esc(b.label) + "</a>";
    }).join("");
    return "<section class=\"hero\"><div class=\"blob b1\"></div><div class=\"blob b2\"></div><div class=\"blob b3\"></div>" +
      "<div class=\"hero-inner\">" +
      "<div class=\"kicker reveal\">" + esc(cfg.tagline) + "</div>" +
      "<h1 class=\"hero-title reveal\">" + richTitle(cfg.heroTitle) + "</h1>" +
      "<p class=\"hero-sub reveal\">" + esc(cfg.heroSub) + "</p>" +
      "<div class=\"btn-row reveal\">" + btns + "</div>" +
      "</div></section>";
  }

  function secHead(kicker, title, sub) {
    return "<div class=\"sec-head reveal\"><div class=\"sec-kicker\">" + esc(kicker) + "</div>" +
      "<h2 class=\"sec-title\">" + esc(title) + "</h2>" +
      (sub ? "<p class=\"sec-sub\">" + esc(sub) + "</p>" : "") + "</div>";
  }

  function cardsSection(id, kicker, title, sub, pairs) {
    var cards = pairs.map(function (p) {
      return "<div class=\"card reveal\"><h3>" + esc(p.title) + "</h3><p>" + esc(p.desc) + "</p></div>";
    }).join("");
    return "<section class=\"section\" id=\"" + id + "\"><div class=\"wrap\">" +
      secHead(kicker, title, sub) + "<div class=\"grid\">" + cards + "</div></div></section>";
  }

  function statsSection(pairs) {
    if (!pairs.length) return "";
    var h = pairs.map(function (p) {
      return "<div class=\"stat reveal\"><b>" + esc(p.title) + "</b><span>" + esc(p.desc) + "</span></div>";
    }).join("");
    return "<section class=\"section\" style=\"padding-top:0;padding-bottom:0\"><div class=\"wrap\"><div class=\"stats\">" + h + "</div></div></section>";
  }

  function testimonialsSection(pairs) {
    if (!pairs.length) return "";
    var h = pairs.map(function (p) {
      return "<div class=\"card reveal\"><p class=\"t-quote\">&ldquo;" + esc(p.title) + "&rdquo;</p>" +
        "<div class=\"t-name\">" + esc(p.desc) + "</div></div>";
    }).join("");
    return "<section class=\"section\" id=\"testimonials\"><div class=\"wrap\">" +
      secHead("Testimonials", "Loved by our clients", "") +
      "<div class=\"grid\">" + h + "</div></div></section>";
  }

  function contactSection(cfg) {
    function line(label, val, href) {
      if (!val) return "";
      var v = href ? "<a href=\"" + esc(href) + "\">" + esc(val) + "</a>" : esc(val);
      return "<div class=\"c-line\"><b>" + label + "</b><span>" + v + "</span></div>";
    }
    return "<section class=\"section\" id=\"contact\"><div class=\"wrap\">" +
      secHead("Contact", "Let's work together", "Tell us about your project — we reply within one business day.") +
      "<div class=\"contact-grid\">" +
      "<div class=\"card reveal\"><h3>Get in touch</h3><p>Prefer email or a call? Reach us directly:</p>" +
      line("Email", cfg.email, cfg.email ? "mailto:" + cfg.email : "") +
      line("Phone", cfg.phone, cfg.phone ? "tel:" + cfg.phone.replace(/[\s-]/g, "") : "") +
      line("Visit", cfg.address, "") +
      "</div>" +
      "<div class=\"card reveal\"><h3>Send a message</h3>" +
      "<form data-to=\"" + esc(cfg.email) + "\" onsubmit=\"return siteMail(this)\">" +
      "<input name=\"nm\" placeholder=\"Your name\" required aria-label=\"Your name\">" +
      "<input name=\"em\" type=\"email\" placeholder=\"Email address\" required aria-label=\"Email address\">" +
      "<textarea name=\"msg\" placeholder=\"Tell us about your project…\" required aria-label=\"Message\"></textarea>" +
      "<button class=\"btn btn-primary\" type=\"submit\" style=\"width:100%\">Send message</button>" +
      "<p style=\"font-size:12.5px;color:var(--muted);margin-top:10px\">Opens your email app — no data is stored anywhere.</p>" +
      "</form></div>" +
      "</div></div></section>";
  }

  function ctaBand(title, sub, btnLabel, href) {
    return "<section style=\"padding:20px 0 90px\"><div class=\"wrap\"><div class=\"cta reveal\">" +
      "<h2>" + esc(title) + "</h2><p>" + esc(sub) + "</p>" +
      "<a class=\"btn btn-primary\" href=\"" + esc(href) + "\">" + esc(btnLabel) + "</a>" +
      "</div></div></section>";
  }

  function footerHTML(cfg) {
    return "<footer><div class=\"wrap\"><p><b>" + esc(cfg.businessName) + "</b> &mdash; " + esc(cfg.tagline) + "</p>" +
      "<p style=\"margin-top:8px\">&copy; <span id=\"year\"></span> " + esc(cfg.businessName) + ". All rights reserved.</p></div></footer>";
  }

  function shell(cfg, opts) {
    return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
      "<title>" + esc(cfg.businessName) + " — " + esc(cfg.tagline) + "</title>\n" +
      "<meta name=\"description\" content=\"" + esc(cfg.heroSub || cfg.tagline) + "\">\n" +
      "<style>\n" + baseCSS(cfg.primary || "#22d3ee") + (opts.extraCSS || "") + "\n</style>\n</head>\n" +
      "<body>\n" + opts.nav + "\n" + opts.hero + "\n<main>\n" + opts.sections + "\n</main>\n" +
      footerHTML(cfg) + "\n<script>\n" + baseJS() + (opts.extraJS || "") + "\n<\/script>\n</body>\n</html>";
  }

  /* ---------------- the five templates ---------------- */

  var TEMPLATES = [
    {
      id: "business",
      name: "Business Landing",
      desc: "Services, stats, testimonials and contact — the classic client site.",
      gradient: "linear-gradient(135deg,#22d3ee,#a78bfa)",
      fields: [
        { key: "businessName", label: "Business name", type: "text", def: "Nova Studio" },
        { key: "tagline", label: "Tagline", type: "text", def: "We build brands that stand out" },
        { key: "primary", label: "Primary color", type: "color", def: "#22d3ee" },
        { key: "heroTitle", label: "Hero headline (wrap accent words in [[ ]])", type: "text", def: "We craft [[digital experiences]] people remember" },
        { key: "heroSub", label: "Hero subtext", type: "textarea", def: "Nova Studio is a full-service creative partner for ambitious companies — strategy, design and engineering under one roof." },
        { key: "servicesText", label: "Services — one per line (Name — description)", type: "textarea", rows: 5, def: "Web design — Conversion-focused websites with a premium feel\nBrand identity — Logos, systems and guidelines that scale\nSEO & growth — Get found, get traffic, get customers\nE-commerce — Stores engineered to sell while you sleep" },
        { key: "statsText", label: "Stats — one per line (Number — label)", type: "textarea", rows: 3, def: "120+ — Projects delivered\n8 yrs — In business\n98% — Client retention" },
        { key: "testimonialsText", label: "Testimonials — one per line (Quote — Client name)", type: "textarea", rows: 4, def: "They rebuilt our site and leads doubled in a quarter. — Priya Sharma, Founder\nFast, honest and ridiculously talented. Best agency we've worked with. — Rahul Verma, CEO" },
        { key: "showTestimonials", label: "Show testimonials section", type: "toggle", def: true },
        { key: "email", label: "Contact email", type: "text", def: "hello@novastudio.example" },
        { key: "phone", label: "Contact phone", type: "text", def: "+91 98765 43210" },
        { key: "address", label: "Address", type: "text", def: "Connaught Place, New Delhi" }
      ],
      build: function (cfg) {
        var services = parsePairs(cfg.servicesText);
        var stats = parsePairs(cfg.statsText);
        var testimonials = cfg.showTestimonials ? parsePairs(cfg.testimonialsText) : [];
        return shell(cfg, {
          nav: navHTML(cfg, [
            { href: "#services", label: "Services" },
            { href: "#testimonials", label: "Reviews" },
            { href: "#contact", label: "Contact" }
          ], { href: "#contact", label: "Get a quote" }),
          hero: heroHTML(cfg, [
            { label: "Our services", href: "#services", primary: true },
            { label: "Contact us", href: "#contact" }
          ]),
          sections:
            statsSection(stats) +
            cardsSection("services", "What we do", "Services built around you", "Everything you need to launch, grow and dominate your market.", services) +
            cardsSection("why", "Why choose us", "The " + cfg.businessName + " difference", "", [
              { title: "Dedicated support", desc: "A real human answers — same-day responses, no ticket black holes." },
              { title: "Transparent pricing", desc: "Fixed quotes up front. No surprises, no scope-creep invoices." },
              { title: "Proven results", desc: "We measure success in your revenue, not our awards shelf." }
            ]) +
            testimonialsSection(testimonials) +
            ctaBand("Ready to start your project?", "Tell us about your goals — we'll reply within one business day.", "Get in touch", "#contact") +
            contactSection(cfg)
        });
      }
    },
    {
      id: "portfolio",
      name: "Portfolio",
      desc: "Showcase work, skills and story — for freelancers and creatives.",
      gradient: "linear-gradient(135deg,#a78bfa,#f472b6)",
      fields: [
        { key: "businessName", label: "Your name", type: "text", def: "Aarav Mehta" },
        { key: "tagline", label: "Role / tagline", type: "text", def: "Product designer & front-end developer" },
        { key: "primary", label: "Primary color", type: "color", def: "#a78bfa" },
        { key: "heroTitle", label: "Hero headline (wrap accent words in [[ ]])", type: "text", def: "I design [[interfaces]] people love to use" },
        { key: "heroSub", label: "Hero subtext", type: "textarea", def: "6 years turning rough ideas into polished products for startups and global brands. Based in Mumbai, working worldwide." },
        { key: "projectsText", label: "Projects — one per line (Title — description)", type: "textarea", rows: 5, def: "Fintech dashboard — Analytics platform used by 40k traders daily\nTravel app — 4.9★ rated booking experience, 2M downloads\nBrand system — Identity for a D2C startup from zero to launch" },
        { key: "skillsText", label: "Skills — comma separated", type: "textarea", rows: 2, def: "UI/UX Design, React, TypeScript, Motion design, Design systems, Figma" },
        { key: "aboutText", label: "About paragraph", type: "textarea", rows: 4, def: "I'm a designer-developer hybrid: I prototype in code, sweat the easing curves, and ship. My work lives at the intersection of beautiful and usable — every pixel has a job to do." },
        { key: "email", label: "Contact email", type: "text", def: "hello@aaravmehta.example" },
        { key: "phone", label: "Contact phone", type: "text", def: "+91 98765 43210" },
        { key: "address", label: "Location", type: "text", def: "Mumbai, India" }
      ],
      build: function (cfg) {
        var projects = parsePairs(cfg.projectsText);
        var skills = parseLines(cfg.skillsText.replace(/,/g, "\n"));
        var work = projects.map(function (p, i) {
          var hue = (i * 47 + 190) % 360;
          return "<div class=\"card reveal\"><div class=\"w-thumb\" style=\"background:linear-gradient(135deg,hsl(" + hue + ",72%,60%),hsl(" + ((hue + 45) % 360) + ",72%,45%))\">" + esc(p.title) + "</div>" +
            "<h3>" + esc(p.title) + "</h3><p>" + esc(p.desc) + "</p></div>";
        }).join("");
        var chips = skills.map(function (s) { return "<span class=\"chip2 reveal\">" + esc(s) + "</span>"; }).join("");
        return shell(cfg, {
          nav: navHTML(cfg, [
            { href: "#work", label: "Work" },
            { href: "#about", label: "About" },
            { href: "#contact", label: "Contact" }
          ], { href: "#contact", label: "Hire me" }),
          hero: heroHTML(cfg, [
            { label: "View my work", href: "#work", primary: true },
            { label: "Get in touch", href: "#contact" }
          ]),
          sections:
            "<section class=\"section\" id=\"work\"><div class=\"wrap\">" +
            secHead("Selected work", "Projects I'm proud of", "A few highlights — every project shipped, measured and iterated.") +
            "<div class=\"grid\">" + work + "</div></div></section>" +
            "<section class=\"section\" id=\"about\" style=\"padding-top:0\"><div class=\"wrap\">" +
            secHead("About", "Designer, developer, problem-solver", "") +
            "<p class=\"reveal\" style=\"max-width:680px;margin:0 auto 34px;text-align:center;color:var(--muted);font-size:16.5px\">" + esc(cfg.aboutText) + "</p>" +
            "<div class=\"chips\">" + chips + "</div></div></section>" +
            ctaBand("Have a project in mind?", "I'm currently booking new work — let's make something great together.", "Let's talk", "#contact") +
            contactSection(cfg)
        });
      }
    },
    {
      id: "restaurant",
      name: "Restaurant & Café",
      desc: "Menu, hours, location and reservations — made to make mouths water.",
      gradient: "linear-gradient(135deg,#f59e0b,#ef4444)",
      fields: [
        { key: "businessName", label: "Restaurant name", type: "text", def: "Saffron & Smoke" },
        { key: "tagline", label: "Tagline", type: "text", def: "Modern Indian kitchen & bar" },
        { key: "primary", label: "Primary color", type: "color", def: "#f59e0b" },
        { key: "heroTitle", label: "Hero headline (wrap accent words in [[ ]])", type: "text", def: "Fire-kissed flavours, [[unforgettable]] nights" },
        { key: "heroSub", label: "Hero subtext", type: "textarea", def: "Slow-cooked, smoke-kissed and served with love — the neighbourhood spot for celebrations big and small." },
        { key: "menuText", label: "Menu — one per line (Dish — price)", type: "textarea", rows: 6, def: "Smoked Butter Chicken — ₹345\nTruffle Naan Basket — ₹185\nCharred Paneer Tikka — ₹295\nSaffron Biryani — ₹325\nMolten Chocolate Samosa — ₹165" },
        { key: "hoursText", label: "Hours — one per line (Days — hours)", type: "textarea", rows: 3, def: "Mon – Thu — 12pm to 11pm\nFri – Sun — 12pm to 12am\nHappy hours — 4pm to 7pm daily" },
        { key: "email", label: "Email", type: "text", def: "reserve@saffronandsmoke.example" },
        { key: "phone", label: "Phone (for reservations)", type: "text", def: "+91 98765 43210" },
        { key: "address", label: "Address", type: "text", def: "14, Linking Road, Bandra West, Mumbai" }
      ],
      build: function (cfg) {
        var menu = parsePairs(cfg.menuText);
        var hours = parsePairs(cfg.hoursText);
        var menuHtml = menu.map(function (m) {
          return "<div class=\"menu-item reveal\"><div><div class=\"m-name\">" + esc(m.title) + "</div>" +
            (m.desc && m.desc.charAt(0) !== "₹" && m.desc.charAt(0) !== "$" ? "<div class=\"m-desc\">" + esc(m.desc) + "</div>" : "") +
            "</div><div class=\"m-price\">" + esc(m.desc) + "</div></div>";
        }).join("");
        var hoursHtml = hours.map(function (h) {
          return "<div class=\"menu-item reveal\"><div><div class=\"m-name\">" + esc(h.title) + "</div></div><div class=\"m-price\" style=\"font-size:15px\">" + esc(h.desc) + "</div></div>";
        }).join("");
        return shell(cfg, {
          nav: navHTML(cfg, [
            { href: "#menu", label: "Menu" },
            { href: "#visit", label: "Hours & Location" },
            { href: "#contact", label: "Contact" }
          ], { href: "tel:" + cfg.phone.replace(/[\s-]/g, ""), label: "Reserve a table" }),
          hero: heroHTML(cfg, [
            { label: "Explore the menu", href: "#menu", primary: true },
            { label: "Reserve a table", href: "tel:" + cfg.phone.replace(/[\s-]/g, "") }
          ]),
          sections:
            "<section class=\"section\" id=\"menu\"><div class=\"wrap\">" +
            secHead("Our menu", "Made fresh, served fast", "Signature dishes from our tandoor and grill — recipes perfected over a decade.") +
            "<div class=\"menu-list\">" + menuHtml + "</div></div></section>" +
            "<section class=\"section\" id=\"visit\" style=\"padding-top:0\"><div class=\"wrap\">" +
            secHead("Visit us", "Hours & location", "") +
            "<div class=\"contact-grid\"><div class=\"card reveal\"><h3>Opening hours</h3><div class=\"menu-list\">" + hoursHtml + "</div></div>" +
            "<div class=\"card reveal\"><h3>Find us</h3><p>" + esc(cfg.address) + "</p>" +
            "<p style=\"margin-top:12px\">Call <a href=\"tel:" + esc(cfg.phone.replace(/[\s-]/g, "")) + "\" style=\"color:var(--primary);font-weight:700\">" + esc(cfg.phone) + "</a> for reservations & party bookings.</p></div>" +
            "</div></div></section>" +
            ctaBand("Hungry already?", "Book your table in under a minute — walk-ins welcome too.", "Call to reserve", "tel:" + cfg.phone.replace(/[\s-]/g, "")) +
            contactSection(cfg)
        });
      }
    },
    {
      id: "agency",
      name: "Agency / Startup",
      desc: "Bold hero, process and results — built to win clients and investors.",
      gradient: "linear-gradient(135deg,#34d399,#22d3ee)",
      fields: [
        { key: "businessName", label: "Company name", type: "text", def: "Launchpad" },
        { key: "tagline", label: "Tagline", type: "text", def: "We turn ideas into funded startups" },
        { key: "primary", label: "Primary color", type: "color", def: "#34d399" },
        { key: "heroTitle", label: "Hero headline (wrap accent words in [[ ]])", type: "text", def: "Your idea, [[launched]] in 90 days" },
        { key: "heroSub", label: "Hero subtext", type: "textarea", def: "Launchpad is a startup studio: we co-build MVPs with founders — product, brand and go-to-market, all in one sprint." },
        { key: "servicesText", label: "Services — one per line (Name — description)", type: "textarea", rows: 5, def: "MVP builds — From napkin sketch to working product in 12 weeks\nBrand & pitch — Decks and identities investors remember\nGrowth engines — Launch playbooks that compound" },
        { key: "processText", label: "Process — one per line (Step — description)", type: "textarea", rows: 4, def: "Discover — We map your market, users and unfair advantage\nDesign — Prototype in days, validate with real users\nBuild — Ship a polished MVP with analytics baked in\nScale — Growth loops, fundraising support, hiring" },
        { key: "workText", label: "Results — one per line (Metric — label)", type: "textarea", rows: 3, def: "32 — Startups launched\n$48M — Raised by portfolio\n4.2x — Avg. revenue growth" },
        { key: "email", label: "Contact email", type: "text", def: "founders@launchpad.example" },
        { key: "phone", label: "Contact phone", type: "text", def: "+91 98765 43210" },
        { key: "address", label: "Address", type: "text", def: "Koramangala, Bengaluru" }
      ],
      build: function (cfg) {
        var services = parsePairs(cfg.servicesText);
        var steps = parsePairs(cfg.processText);
        var stats = parsePairs(cfg.workText);
        var stepsHtml = steps.map(function (s, i) {
          return "<div class=\"step reveal\"><div class=\"step-num\">" + (i + 1) + "</div><h3>" + esc(s.title) + "</h3><p>" + esc(s.desc) + "</p></div>";
        }).join("");
        return shell(cfg, {
          nav: navHTML(cfg, [
            { href: "#services", label: "What we do" },
            { href: "#process", label: "Process" },
            { href: "#contact", label: "Contact" }
          ], { href: "#contact", label: "Apply now" }),
          hero: heroHTML(cfg, [
            { label: "Start your build", href: "#contact", primary: true },
            { label: "See our process", href: "#process" }
          ]),
          sections:
            statsSection(stats) +
            cardsSection("services", "What we do", "End-to-end venture building", "One team for product, brand and growth — no handoffs, no silos.", services) +
            "<section class=\"section\" id=\"process\" style=\"padding-top:0\"><div class=\"wrap\">" +
            secHead("How it works", "From idea to launch in four moves", "") +
            "<div class=\"steps\">" + stepsHtml + "</div></div></section>" +
            ctaBand("Have the next big idea?", "Applications open for our next build cohort — 3 spots left this quarter.", "Apply now", "#contact") +
            contactSection(cfg)
        });
      }
    },
    {
      id: "comingsoon",
      name: "Coming Soon",
      desc: "Countdown, notify-me form and socials — launch with a bang.",
      gradient: "linear-gradient(135deg,#f472b6,#a78bfa)",
      fields: [
        { key: "businessName", label: "Brand name", type: "text", def: "Pulse" },
        { key: "tagline", label: "Tagline", type: "text", def: "Something big is brewing" },
        { key: "primary", label: "Primary color", type: "color", def: "#f472b6" },
        { key: "heroTitle", label: "Headline (wrap accent words in [[ ]])", type: "text", def: "We're launching [[something amazing]]" },
        { key: "heroSub", label: "Subtext", type: "textarea", def: "Pulse is the easiest way to track your habits, goals and streaks — beautifully. Join the waitlist and get 3 months free at launch." },
        { key: "launchDate", label: "Launch date", type: "date", def: "2026-12-01" },
        { key: "socialsText", label: "Socials — one per line (Label — URL)", type: "textarea", rows: 3, def: "Instagram — https://instagram.com/pulse\nX — https://x.com/pulse\nLinkedIn — https://linkedin.com/company/pulse" },
        { key: "email", label: "Contact email", type: "text", def: "hello@pulse.example" }
      ],
      build: function (cfg) {
        var socials = parsePairs(cfg.socialsText).filter(function (s) { return /^https?:\/\//i.test(s.desc); });
        var socialHtml = socials.map(function (s) {
          return "<a href=\"" + esc(s.desc) + "\" target=\"_blank\" rel=\"noopener\">" + esc(s.title) + "</a>";
        }).join("");
        return shell(cfg, {
          nav: navHTML(cfg, [], null),
          hero:
            "<section class=\"hero\" style=\"min-height:82vh;display:flex;align-items:center\"><div class=\"blob b1\"></div><div class=\"blob b2\"></div><div class=\"blob b3\"></div>" +
            "<div class=\"hero-inner\" style=\"width:100%\">" +
            "<div class=\"kicker reveal\">" + esc(cfg.tagline) + "</div>" +
            "<h1 class=\"hero-title reveal\">" + richTitle(cfg.heroTitle) + "</h1>" +
            "<p class=\"hero-sub reveal\">" + esc(cfg.heroSub) + "</p>" +
            "<div class=\"count reveal\" id=\"cd\" data-date=\"" + esc(cfg.launchDate) + "\">" +
            "<div><b id=\"cd-d\">–</b><span>days</span></div>" +
            "<div><b id=\"cd-h\">–</b><span>hours</span></div>" +
            "<div><b id=\"cd-m\">–</b><span>mins</span></div>" +
            "<div><b id=\"cd-s\">–</b><span>secs</span></div>" +
            "</div>" +
            "<form class=\"notify reveal\" onsubmit=\"return notifyGo(this)\">" +
            "<input type=\"email\" name=\"em\" placeholder=\"you@example.com\" required aria-label=\"Email address\">" +
            "<button class=\"btn btn-primary\" type=\"submit\" style=\"width:100%\">Notify me at launch</button>" +
            "</form>" +
            "<div class=\"notify-ok\" id=\"notifyOk\">You're on the list — we'll email you the moment we launch.</div>" +
            (socialHtml ? "<div class=\"socials reveal\">" + socialHtml + "</div>" : "") +
            "</div></section>",
          sections: "",
          extraJS:
            "window.notifyGo=function(f){f.style.display='none';document.getElementById('notifyOk').style.display='block';return false;};\n" +
            "(function(){var box=document.getElementById('cd');if(!box)return;var target=new Date(box.getAttribute('data-date')+'T00:00:00');if(isNaN(target))return;\n" +
            "function pad(n){return (n<10?'0':'')+n;}\n" +
            "function tick(){var diff=target-new Date();if(diff<0)diff=0;var s=Math.floor(diff/1000);\n" +
            "document.getElementById('cd-d').textContent=Math.floor(s/86400);\n" +
            "document.getElementById('cd-h').textContent=pad(Math.floor(s%86400/3600));\n" +
            "document.getElementById('cd-m').textContent=pad(Math.floor(s%3600/60));\n" +
            "document.getElementById('cd-s').textContent=pad(s%60);}\n" +
            "tick();setInterval(tick,1000);})();"
        });
      }
    }
  ];

  function template(id) {
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].id === id) return TEMPLATES[i];
    }
    return TEMPLATES[0];
  }

  /* Pure: build a complete site file for a template + config. */
  function buildSite(id, cfg) {
    var t = template(id);
    var full = {};
    t.fields.forEach(function (f) {
      full[f.key] = (cfg && cfg[f.key] !== undefined && cfg[f.key] !== "") ? cfg[f.key] : f.def;
    });
    return t.build(full);
  }

  function defaultConfig(id) {
    var cfg = {};
    template(id).fields.forEach(function (f) { cfg[f.key] = f.def; });
    return cfg;
  }

  /* ---------------- module UI ---------------- */

  function $(id) { return document.getElementById(id); }

  var els = {};
  var curId = null;
  var curCfg = null;
  var previewTimer = null;

  function getConfig(id) {
    var saved = ((LSR.state.sites || {}).configs || {})[id] || {};
    var cfg = {};
    template(id).fields.forEach(function (f) {
      cfg[f.key] = (saved[f.key] !== undefined && saved[f.key] !== "") ? saved[f.key] : f.def;
    });
    return cfg;
  }

  function persist() {
    if (!LSR.state.sites) LSR.state.sites = { templateId: curId, configs: {} };
    LSR.state.sites.templateId = curId;
    LSR.state.sites.configs[curId] = curCfg;
    LSR.save();
  }

  function init() {
    els = {
      grid: $("sites-template-grid"),
      form: $("sites-form"),
      formTitle: $("sites-form-title"),
      preview: $("sites-preview"),
      skel: $("sites-preview-skel"),
      tplName: $("sites-tpl-name"),
      exportBtn: $("btn-export-site")
    };
    if (!els.grid) return;
    renderGallery();
    selectTemplate((LSR.state.sites && LSR.state.sites.templateId) || TEMPLATES[0].id);
    els.exportBtn.addEventListener("click", exportSite);
    els.preview.addEventListener("load", function () { els.skel.style.display = "none"; });
  }

  function selectTemplate(id) {
    curId = id;
    curCfg = getConfig(id);
    persist();
    renderGallery();
    renderForm();
    queuePreview();
  }

  function renderGallery() {
    els.grid.innerHTML = "";
    TEMPLATES.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "template-card" + (t.id === curId ? " selected" : "");
      b.setAttribute("aria-pressed", t.id === curId ? "true" : "false");

      var thumb = document.createElement("div");
      thumb.className = "tpl-thumb";
      thumb.style.background = t.gradient;

      var name = document.createElement("div");
      name.className = "tpl-name";
      name.textContent = t.name;

      var desc = document.createElement("div");
      desc.className = "tpl-desc";
      desc.textContent = t.desc;

      b.appendChild(thumb);
      b.appendChild(name);
      b.appendChild(desc);
      b.addEventListener("click", function () { selectTemplate(t.id); });
      els.grid.appendChild(b);
    });
  }

  function renderForm() {
    var t = template(curId);
    els.formTitle.textContent = "Customize — " + t.name;
    els.tplName.textContent = t.name;
    els.form.innerHTML = "";
    t.fields.forEach(function (f) {
      var wrap = document.createElement("div");
      wrap.className = "sites-field" + (f.type === "toggle" ? " sites-field-toggle" : "");

      var lab = document.createElement("label");
      lab.textContent = f.label;
      lab.htmlFor = "sf_" + f.key;

      var input;
      if (f.type === "textarea") {
        input = document.createElement("textarea");
        input.rows = f.rows || 3;
        input.value = curCfg[f.key] || "";
      } else if (f.type === "color") {
        input = document.createElement("input");
        input.type = "color";
        input.value = /^#[0-9a-fA-F]{6}$/.test(curCfg[f.key] || "") ? curCfg[f.key] : "#22d3ee";
      } else if (f.type === "date") {
        input = document.createElement("input");
        input.type = "date";
        input.value = curCfg[f.key] || "";
      } else if (f.type === "toggle") {
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!curCfg[f.key];
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.value = curCfg[f.key] || "";
      }
      input.id = "sf_" + f.key;
      input.setAttribute("aria-label", f.label);

      input.addEventListener("input", function () {
        curCfg[f.key] = (f.type === "toggle") ? input.checked : input.value;
        persist();
        queuePreview();
      });

      wrap.appendChild(lab);
      wrap.appendChild(input);
      els.form.appendChild(wrap);
    });
  }

  function queuePreview() {
    els.skel.style.display = "flex";
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(function () {
      try {
        els.preview.srcdoc = buildSite(curId, curCfg);
        // 'load' event hides the skeleton; fallback in case it never fires
        setTimeout(function () { els.skel.style.display = "none"; }, 2500);
      } catch (e) {
        els.skel.style.display = "none";
        LSR.toast("Preview error: " + e.message, "error");
      }
    }, 250);
  }

  function exportSite() {
    try {
      var html = buildSite(curId, curCfg);
      var blob = new Blob([html], { type: "text/html" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = slugify(curCfg.businessName) + "-site.html";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 600);
      LSR.toast("Site exported — upload this file to any host or domain.", "success");
    } catch (e) {
      LSR.toast("Export failed: " + e.message, "error");
    }
  }

  window.LSR = window.LSR || {};
  LSR.sites = {
    init: init,
    selectTemplate: selectTemplate,
    exportSite: exportSite,
    buildSite: buildSite,
    defaultConfig: defaultConfig,
    templates: TEMPLATES,
    // pure helpers exposed for tests
    _esc: esc,
    _parseLines: parseLines,
    _splitPair: splitPair,
    _parsePairs: parsePairs,
    _slugify: slugify,
    _hexToRgba: hexToRgba,
    _template: template
  };
})();
