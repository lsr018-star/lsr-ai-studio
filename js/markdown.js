/* ============================================================
   LSR AI STUDIO — js/markdown.js
   Lite markdown renderer (pure functions, no DOM):
   fenced code blocks w/ copy button, headings, bold/italic,
   inline code, links, lists, blockquotes, tables, hr.
   ============================================================ */
(function () {
  "use strict";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inlineFormat(s) {
    // s is already HTML-escaped
    return s
      .replace(/`([^`\n]+)`/g, "<code class=\"inline\">$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "<a href=\"$2\" target=\"_blank\" rel=\"noopener\">$1</a>");
  }

  function renderMarkdown(src) {
    var codeBlocks = [];
    // 1. Extract fenced code blocks -> placeholders
    var text = String(src).replace(/```(\w*)\n([\s\S]*?)(?:```|$)/g, function (_, lang, code) {
      codeBlocks.push({ lang: (lang || "code").toLowerCase(), code: code.replace(/\n$/, "") });
      return "\u0000CODE" + (codeBlocks.length - 1) + "\u0000";
    });

    var lines = escapeHtml(text).split("\n");
    var html = [];
    var listStack = []; // "ul" | "ol"

    function closeLists() {
      while (listStack.length) html.push("</" + listStack.pop() + ">");
    }

    var inTable = false;
    var i, line, m;

    for (i = 0; i < lines.length; i++) {
      line = lines[i];

      // code block placeholder -> its own block
      if (/^\u0000CODE\d+\u0000$/.test(line.trim())) {
        closeLists();
        if (inTable) { html.push("</tbody></table>"); inTable = false; }
        var idx = parseInt(line.trim().replace(/\u0000CODE|\u0000/g, ""), 10);
        var cb = codeBlocks[idx];
        html.push(
          "<div class=\"codeblock\"><div class=\"codeblock-head\"><span>" +
          escapeHtml(cb.lang) +
          "</span><button class=\"copy-btn\" data-copy-idx=\"" + idx +
          "\" type=\"button\">Copy</button></div><pre><code>" +
          escapeHtml(cb.code) + "</code></pre></div>"
        );
        continue;
      }

      // table row
      if (/^\|.*\|\s*$/.test(line) && line.indexOf("|") !== -1) {
        var cells = line.trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); });
        if (!inTable) { closeLists(); html.push("<table><tbody>"); inTable = true; }
        // separator row like |---|---|
        if (cells.every(function (c) { return /^:?-{2,}:?$/.test(c); })) continue;
        html.push("<tr>" + cells.map(function (c) { return "<td>" + inlineFormat(c) + "</td>"; }).join("") + "</tr>");
        continue;
      } else if (inTable) { html.push("</tbody></table>"); inTable = false; }

      // headings
      m = line.match(/^(#{1,4})\s+(.*)$/);
      if (m) {
        closeLists();
        var lvl = m[1].length;
        html.push("<h" + lvl + ">" + inlineFormat(m[2].trim()) + "</h" + lvl + ">");
        continue;
      }

      // hr
      if (/^---+$/.test(line.trim())) { closeLists(); html.push("<hr>"); continue; }

      // blockquote
      m = line.match(/^&gt;\s?(.*)$/);
      if (m) { closeLists(); html.push("<blockquote>" + inlineFormat(m[1]) + "</blockquote>"); continue; }

      // unordered list
      m = line.match(/^\s*[-*]\s+(.*)$/);
      if (m) {
        if (listStack[listStack.length - 1] !== "ul") { closeLists(); html.push("<ul>"); listStack.push("ul"); }
        html.push("<li>" + inlineFormat(m[1]) + "</li>");
        continue;
      }

      // ordered list
      m = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (m) {
        if (listStack[listStack.length - 1] !== "ol") { closeLists(); html.push("<ol>"); listStack.push("ol"); }
        html.push("<li>" + inlineFormat(m[1]) + "</li>");
        continue;
      }

      // blank line
      if (!line.trim()) { closeLists(); continue; }

      // paragraph
      closeLists();
      html.push("<p>" + inlineFormat(line) + "</p>");
    }
    closeLists();
    if (inTable) html.push("</tbody></table>");

    // stash raw code for copy buttons
    renderMarkdown._codes = codeBlocks.map(function (c) { return c.code; });
    return html.join("\n");
  }

  function getCode(idx) {
    return (renderMarkdown._codes || [])[idx] || "";
  }

  window.LSR = window.LSR || {};
  LSR.escapeHtml = escapeHtml;
  LSR.renderMarkdown = renderMarkdown;
  LSR.getRenderedCode = getCode;
})();
