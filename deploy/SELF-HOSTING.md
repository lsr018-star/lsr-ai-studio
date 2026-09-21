# Self-hosting LSR AI Studio

An honest, hype-free guide. The Studio is a static site — hosting it is
free and easy. Self-hosted *inference* (running the AI model yourself) is
a different story, and this guide tells you exactly what it needs.

## Part 1 — Host the Studio itself (free)

The app is plain HTML/CSS/JS with no build step. Any static host works.

### Option A — AWS Amplify (recommended, matches the Jarvis setup)

1. Push this repo to GitHub (`lsr018-star/lsr-ai-studio`).
2. Amplify console → **New app → Host web app → GitHub** → pick the repo.
3. Amplify auto-detects a static site — no build settings needed. If it asks:
   - Build command: *(empty)*
   - Output directory: `/` (repo root)
4. Deploy. You get `https://main.<app-id>.amplifyapp.com`.

### Option B — Netlify / Vercel / GitHub Pages

Same idea: connect the repo, no build command, publish directory = repo root.

## Part 2 — Your own domain (for you and for client sites)

**What costs money:** the domain name itself — typically **$10–15/year**
for a `.com` from registrars like Cloudflare Registrar, Porkbun or
Namecheap. There is no legitimate way to get a custom domain for free
(other than free subdomains like `yourname.github.io`).

**What is free:** DNS hosting, SSL certificates, and static hosting.

Steps (Amplify example):

1. Buy the domain at your registrar.
2. In Amplify → your app → **Custom domains** → Add domain → enter it.
3. Amplify shows you the DNS records (a CNAME, plus validation records).
4. Add those records at your registrar / Cloudflare DNS.
5. Wait for DNS to propagate (minutes to a few hours). Amplify provisions
   a free SSL certificate automatically.

For a **client site** exported from Studio Sites: it's a single HTML file.
Upload it to the same Amplify app (or a new one per client), attach the
client's domain the same way, and hand over the keys.

## Part 3 — Self-hosted AI inference (the honest version)

The `docker-compose.yml` in this folder wires three services:

| Service | What it does | Port |
|---|---|---|
| `studio` | Serves this static app via nginx | 8080 |
| `litellm` | OpenAI-compatible gateway (one endpoint, many models) | 4000 |
| `vllm` | Serves an open-weights model on **your GPU** | 8000 |

### What vLLM really requires

- An **NVIDIA GPU machine**. There is no free, unlimited GPU tier
  anywhere — anyone promising that is selling something.
- Rough sizing: a 7B model (default here) needs ~16GB VRAM (e.g. RTX 4090,
  L4, A10). A 70B model needs ~40GB+ (A100/H100 class).
- Rough cloud cost: **~$0.50–$3+/hour** depending on GPU, or buy your own
  card and run it at home for the price of electricity.

### Run it

```bash
cd deploy
cp .env.example .env        # fill in values
docker compose up -d --build
```

Then in the Studio: **Settings → Live API → Custom OpenAI-compatible**

- Base URL: `http://YOUR-SERVER-IP:4000`
- API key: your `LITELLM_MASTER_KEY`
- Model: `studio-free`

Flip the top-bar picker to **Live**. Chat and Code Lab now stream from
your own GPU.

### The free alternative (recommended for most people)

Skip the GPU entirely. The Studio's built-in providers are free:

- **Pollinations Free** — no key, works instantly.
- **OpenRouter** — free `:free` models with a free key.
- **Google Gemini** — generous free tier with a free key.
- **Groq** — very fast, free tier with a free key.

You can also point LiteLLM at a free cloud model instead of vLLM — see
the commented `studio-cloud-free` route in `litellm-config.yaml`. Then
`docker compose up litellm studio` runs with **no GPU at all**.

## Security notes

- Don't expose port 4000/8000 to the whole internet without auth and TLS.
  Keep them on a private network or behind a reverse proxy with HTTPS.
- Change `LITELLM_MASTER_KEY` from the example value.
- Never commit a real `.env` — it's gitignored by convention; keep it that way.
