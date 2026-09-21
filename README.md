# LSR AI Studio

A futuristic, all-in-one AI workspace that runs **100% in the browser** — no build step, no dependencies, no backend required.

**LSR AI Studio is a companion to [Jarvis — Your AI workspace](https://main.dwb18rc54yd27.amplifyapp.com) by LSR.AI.** Where Jarvis runs your cloud AI workspace (projects, agents, cloud automations, browser QA, releases), the Studio is a lightweight local companion: instant chat, a code lab, local automations, model discovery, and a client website builder — everything persisted in `localStorage` on your device.

## Features

| Module | What it does |
|---|---|
| **Chat** | Streaming AI conversation with lite-markdown rendering (headings, bold, code blocks with copy buttons, lists, tables, images), stop/regenerate, per-conversation history in `localStorage`, token-ish stats. **Image button** generates free AI images from your prompt |
| **Code Lab** | Multi-file editor with tabs (add/rename/close), line numbers, regex syntax highlighting for JavaScript / Python / HTML, AI side panel (Explain, Find bugs, Generate + *Insert into editor*), one-click **Run** for JavaScript with `console.log` capture |
| **Studio Sites** | Client-ready website builder: 5 premium animated templates (Business, Portfolio, Restaurant, Agency, Coming Soon), live preview, one-click **export as a single self-contained HTML file** — upload to any host/domain or hand to clients |
| **Automations** | Local schedule list — name, cron expression, task prompt, enabled toggle. **Run now** fires the prompt into Chat as a new message |
| **Models** | Cards for Qwen3-Coder-Next, DeepSeek-V3 and Kimi K3, plus a note that any OpenAI-compatible model works |
| **Settings** | Provider-based Live API config (see below), accent themes (cyan/violet/emerald), background-animation toggle, export/import/clear all data as JSON |

Extras: `Ctrl/⌘+K` command palette, `Ctrl/⌘+N` new chat, `Alt+S` Studio Sites, `Esc` to stop/close, toasts, custom scrollbars, responsive drawer sidebar, PWA installable (manifest + service worker on http(s)), `prefers-reduced-motion` support.

## Free AI providers (Live mode)

The top bar shows a **Demo / Live** pill and a model picker. Pick a provider in **Settings → Live API**:

| Provider | Cost | Key needed? | Default model |
|---|---|---|---|
| **Pollinations Free** (default) | 100% free | **No** — works instantly | `openai-fast` |
| OpenRouter | Free `:free` models | Free key from openrouter.ai | `meta-llama/llama-3.3-70b-instruct:free` |
| Google Gemini | Generous free tier | Free key from Google AI Studio | `gemini-2.0-flash` |
| Groq | Free tier, very fast | Free key from console.groq.com | `llama-3.3-70b-versatile` |
| Custom OpenAI-compatible | Yours | Your server | vLLM / Ollama / LiteLLM / NIM… |

Chat and Code Lab stream real completions from the active provider via `fetch` with SSE parsing. Credentials are stored in `localStorage` only and sent solely to your chosen provider. Older single-endpoint settings (if any) migrate automatically into the **Custom** provider slot.

- **Demo mode (default)** — a built-in client-side response engine (`js/demo.js`) streams plausible answers: greetings, code samples (fibonacci, quicksort, fetch, todo app), explanations, debugging checklists, and reflective fallbacks. Code Lab AI actions use smart static templates. Nothing leaves your browser.

## Studio Sites — build & sell client websites

**Studio Sites** is the money feature: pick one of 5 high-class, animated, mobile-responsive single-page templates, customize it (business name, tagline, brand color, headlines, services/menu/projects as simple line lists, contact info, section toggles), preview it live, then hit **Export HTML**.

What you get is **one self-contained `.html` file** — all CSS and JS inlined, zero dependencies, zero external requests. That means:

- Upload it to **any host** (Amplify, Netlify, GitHub Pages — all free tiers)
- Attach **any domain** (yours or the client's — see `deploy/SELF-HOSTING.md`)
- Hand the file directly to a client — it works from `file://` too

Templates: **Business Landing**, **Portfolio**, **Restaurant & Café**, **Agency / Startup**, **Coming Soon** (with live countdown + notify-me form). Every template has a sticky glass nav with mobile hamburger menu, gradient-mesh animated hero, scroll-reveal sections, and `prefers-reduced-motion` support.

## Self-hosting pack (`deploy/`)

- `docker-compose.yml` — nginx (static studio) + LiteLLM gateway + vLLM model server
- `litellm-config.yaml` — one OpenAI-compatible endpoint (`studio-free`) in front of vLLM, with an optional free-cloud route
- `nginx.conf`, `.env.example`
- **`SELF-HOSTING.md`** — the honest guide: free static hosting, custom-domain steps and real costs, what GPU inference actually requires, and how to point the Studio's Custom provider at your LiteLLM URL

## Project structure

```
lsr-ai-studio/
├── index.html           # App shell (sidebar, topbar, 6 modules, palette, toasts)
├── manifest.webmanifest # PWA manifest
├── sw.js                # Service worker — cache-first app shell (http(s) only)
├── icons/               # PWA icons (SVG)
├── css/
│   └── styles.css       # Dark futuristic design system (glass, neon accents, responsive)
├── js/
│   ├── state.js         # Store + provider catalog + localStorage persistence + pub/sub
│   ├── markdown.js      # Lite markdown renderer (pure, no DOM)
│   ├── demo.js          # Demo-mode response engine (pure, no DOM)
│   ├── api.js           # Provider-aware OpenAI-compatible streaming client + Demo/Live router
│   ├── chat.js          # Chat UI: conversations, streaming, stats, image generation
│   ├── codelab.js       # Editor, highlighting, AI panel, JS runner
│   ├── automations.js   # Schedules CRUD + Run-now → Chat
│   ├── sites.js         # Studio Sites: 5 template builders + gallery/preview/export UI
│   └── app.js           # Shell: routing, palette, toasts, canvas bg, settings, PWA
├── deploy/              # docker-compose + nginx + LiteLLM + honest self-hosting guide
├── tests/
│   └── test.js          # DOM-less node harness (147 assertions)
└── README.md
```

No CDNs, no npm, no build. Plain scripts share the `window.LSR` namespace (classic `<script>` tags, so it also works from `file://`).

## Run locally

```bash
cd lsr-ai-studio
python3 -m http.server 8080
# open http://localhost:8080
```

Or just double-click `index.html` — everything works from `file://` too (the service worker stays off by design; localStorage may be limited in some browsers' file mode).

## Test

```bash
node tests/test.js   # 147 assertions, no DOM, no network
```

## Deploy to AWS Amplify (static)

1. Push this folder to a Git repo (e.g. `lsr018-star/lsr-ai-studio`).
2. In the Amplify console: **New app → Host web app → GitHub →** pick the repo.
3. Amplify auto-detects a static site — no build settings needed. If it asks, set:
   - Build command: *(empty)*
   - Output directory: `/` (repo root, since `index.html` sits at the top)
4. Deploy. Your URL will look like `https://main.<app-id>.amplifyapp.com`.

Optional SPA-style rewrite (not required — every route is the same `index.html`):
`/​* → /index.html (200)`.

## What's free vs. what isn't (honest list)

| Free | Not free |
|---|---|
| The Studio app itself, forever | A **custom domain** (~$10–15/year) |
| Pollinations chat + image generation, no key | **GPU hosting** for self-hosted vLLM (~$0.50–$3+/hr cloud, or your own card) |
| OpenRouter `:free` models, Gemini free tier, Groq free tier (free keys) | Paid API usage beyond free tiers (OpenAI, etc.) |
| Static hosting: Amplify / Netlify / GitHub Pages free tiers, free SSL | |
| Exported client sites — single HTML, host anywhere free | |

## Privacy

All data (conversations, code files, schedules, site configs, settings, API keys) lives in the browser's `localStorage`. The only network requests the app ever makes are the ones *you* trigger: your chosen AI provider in Live mode, and Pollinations image URLs when you generate images.

## Roadmap ideas

- Cron evaluation loop for Automations (currently manual Run-now by design)
- Web-Worker sandbox for the JS runner
- IndexedDB for larger histories

---

Built by LSR.AI · companion to Jarvis — Your AI workspace.
