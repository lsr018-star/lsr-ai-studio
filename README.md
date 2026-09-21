# LSR AI Studio

A futuristic, all-in-one AI workspace that runs **100% in the browser** — no build step, no dependencies, no backend required.

**LSR AI Studio is a companion to [Jarvis — Your AI workspace](https://main.dwb18rc54yd27.amplifyapp.com) by LSR.AI.** Where Jarvis runs your cloud AI workspace (projects, agents, cloud automations, browser QA, releases), the Studio is a lightweight local companion: instant chat, a code lab, local automations, and model discovery — everything persisted in `localStorage` on your device.

## Features

| Module | What it does |
|---|---|
| **Chat** | Streaming AI conversation with lite-markdown rendering (headings, bold, code blocks with copy buttons, lists, tables), stop/regenerate, per-conversation history in `localStorage`, token-ish stats |
| **Code Lab** | Multi-file editor with tabs (add/rename/close), line numbers, regex syntax highlighting for JavaScript / Python / HTML, AI side panel (Explain, Find bugs, Generate + *Insert into editor*), one-click **Run** for JavaScript with `console.log` capture |
| **Automations** | Local schedule list — name, cron expression, task prompt, enabled toggle. **Run now** fires the prompt into Chat as a new message |
| **Models** | Cards for Qwen3-Coder-Next, DeepSeek-V3 and Kimi K3, plus a note that any OpenAI-compatible model works |
| **Settings** | Live API config, accent themes (cyan/violet/emerald), background-animation toggle, export/import/clear all data as JSON |

Extras: `Ctrl/⌘+K` command palette, `Ctrl/⌘+N` new chat, `Esc` to stop/close, toasts, custom scrollbars, responsive collapsible sidebar, `prefers-reduced-motion` support.

## Demo mode vs Live mode

The top bar shows a **Demo / Live** pill and a model picker.

- **Demo mode (default)** — a built-in client-side response engine (`js/demo.js`) streams plausible answers: greetings, code samples (fibonacci, quicksort, fetch, todo app), explanations, debugging checklists, and reflective fallbacks. Code Lab AI actions use smart static templates. Nothing leaves your browser.
- **Live mode** — paste any **OpenAI-compatible** base URL + API key + model name in **Settings → Live API** (e.g. OpenAI, a self-hosted vLLM server, a LiteLLM gateway, Ollama, NVIDIA NIM). Chat and Code Lab then stream real completions via `fetch` with SSE parsing. Credentials are stored in `localStorage` only and sent solely to your configured endpoint.

Switch modes from the model picker in the top bar. If Live is selected without credentials, the app guides you to Settings.

## Project structure

```
lsr-ai-studio/
├── index.html          # App shell (sidebar, topbar, 5 modules, palette, toasts)
├── css/
│   └── styles.css      # Dark futuristic design system (glass, neon accents, responsive)
├── js/
│   ├── state.js        # Store + localStorage persistence + pub/sub
│   ├── markdown.js     # Lite markdown renderer (pure, no DOM)
│   ├── demo.js         # Demo-mode response engine (pure, no DOM)
│   ├── api.js          # OpenAI-compatible streaming client + Demo/Live router
│   ├── chat.js         # Chat UI: conversations, streaming, stats
│   ├── codelab.js      # Editor, highlighting, AI panel, JS runner
│   ├── automations.js  # Schedules CRUD + Run-now → Chat
│   └── app.js          # Shell: routing, palette, toasts, canvas bg, settings
└── README.md
```

No CDNs, no npm, no build. Plain scripts share the `window.LSR` namespace (classic `<script>` tags, so it also works from `file://`).

## Run locally

```bash
cd lsr-ai-studio
python3 -m http.server 8080
# open http://localhost:8080
```

Or just double-click `index.html` — everything works from `file://` too (localStorage may be limited in some browsers' file mode).

## Deploy to AWS Amplify (static)

1. Push this folder to a Git repo (e.g. `lsr018-star/lsr-ai-studio`).
2. In the Amplify console: **New app → Host web app → GitHub →** pick the repo.
3. Amplify auto-detects a static site — no build settings needed. If it asks, set:
   - Build command: *(empty)*
   - Output directory: `/` (repo root, since `index.html` sits at the top)
4. Deploy. Your URL will look like `https://main.<app-id>.amplifyapp.com`.

Optional SPA-style rewrite (not required — every route is the same `index.html`):
`/​* → /index.html (200)`.

## Privacy

All data (conversations, code files, schedules, settings, API keys) lives in the browser's `localStorage`. The only network requests the app ever makes are the ones *you* configure in Live mode, to *your* endpoint.

## Roadmap ideas

- Cron evaluation loop for Automations (currently manual Run-now by design)
- Web-Worker sandbox for the JS runner
- IndexedDB for larger histories, PWA manifest for installability

---

Built by LSR.AI · companion to Jarvis — Your AI workspace.
