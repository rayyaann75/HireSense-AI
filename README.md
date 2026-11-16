# HireSense AI

An AI-powered **Resume & Portfolio Agent**. Upload a resume (PDF, DOCX, or image) or paste a portfolio URL, and then chat with an AI that answers questions about the candidate — like an assistant that has already read the whole CV.

Instead of scanning a resume yourself, you ask it things like *"What is this person's strongest skill?"* or *"Show me their projects"* and get a clean, conversational, formatted answer.

---

## What It Does

- **Understands many document types** — PDF, DOCX, PNG/JPG images, and plain text.
- **Reads websites** — paste a portfolio/personal-site URL and it extracts the content.
- **Chats about the candidate** — a chat interface that answers recruiter-style questions.
- **Rich answers** — the AI returns formatted markdown, plus structured **project cards** and a **contact block** when relevant.
- **Speaks the answer out loud** — optional text-to-speech for responses.
- **Clean, animated UI** — dark theme, smooth message transitions, auto-scroll like ChatGPT.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | **Next.js 16** (App Router, Turbopack) |
| UI Library | **React 19** |
| Language | **TypeScript** |
| Styling | **Tailwind CSS v4**, **shadcn/ui**, Base UI, Radix UI |
| Animation | **Framer Motion** |
| Icons | **Lucide React** |
| State Management | **Zustand** |
| Markdown Rendering | **react-markdown** + **remark-gfm** |
| HTTP Client | **axios** |
| AI SDK | **OpenAI SDK** (used as a universal client for MiniMax / OpenAI / OpenRouter) |
| PDF Parsing | **pdf-parse** (v2) |
| DOCX Parsing | **mammoth** |
| Web Scraping | **Jina Reader** (`r.jina.ai`) |
| Text-to-Speech | **OpenAI TTS** (with browser Web Speech API fallback) |
| Fonts | **Geist** via `next/font` |

---

## How It Works

```
Upload file  ─┐
              ├─►  /api/analyze  ─►  extracted text  ─►  app state
Paste URL    ─┘   /api/analyze-url

                          │
                          ▼
       /api/chat  ◄── system prompt + resume text + chat history
                          │
                          ▼
        AI answer ─► parsed for <projects> / <contact> tags ─► rich UI + auto-scroll
```

1. **Ingestion** — a file or URL is turned into plain text:
   - PDF → parsed with `pdf-parse`
   - DOCX → parsed with `mammoth`
   - Image → **AI vision** reads the text out of the picture
   - URL → **Jina Reader** converts the site into clean markdown
2. **Chat** — that text is injected into the system prompt, and every question you ask is answered by the AI with the resume as context.
3. **Rich output** — the AI can emit special tags (`<projects>`, `<contact>`, `<message_action />`) which the frontend turns into real UI components instead of raw text.

---

## Getting Started

### 1. Prerequisites
- **Node.js 18+**
- An API key from **OpenRouter** (free tier works) — or OpenAI / MiniMax

### 2. Install dependencies
```bash
npm install
```

### 3. Add your API key
Create a file named **`.env.local`** in the project root and add:
```bash
OPENROUTER_API_KEY=your_key_here
```
> The app also supports `OPENAI_API_KEY` and `MINIMAX_API_KEY`. It picks whichever is available, in that priority: MiniMax → OpenAI → OpenRouter.

### 4. Run it
```bash
npm run dev
```
Open **http://localhost:3000** in your browser.

### 5. Build for production
```bash
npm run build
npm run start
```

---

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Main client UI (chat + upload)
│   ├── layout.tsx               # Root layout & fonts
│   ├── globals.css              # Global styles / theme
│   └── api/
│       ├── analyze/route.ts     # File → text (PDF / DOCX / image / txt)
│       ├── analyze-url/route.ts # URL → text (via Jina Reader)
│       ├── chat/route.ts        # Chat with the resume as context
│       └── tts/route.ts         # Text-to-speech
├── components/ui/               # Reusable UI components (shadcn/ui)
└── lib/
    ├── ai.ts                    # AI provider configuration
    ├── store.ts                 # Zustand global state
    └── utils.ts                 # Helpers
```

---

## How This Project Was Brought to Life (Built with Trae)

The project was originally started back in **April 2026**, but after sitting untouched for months it no longer built or ran. Reviving it was done entirely inside **[Trae](https://www.trae.ai)** — Trae's AI agent was used as the developer's pair-programmer, and the work followed a strict *diagnose → fix → verify* loop instead of guesswork.

**What Trae's agent actually did:**

1. **Read the real code, not assumptions** — it scanned the whole codebase before changing anything.
2. **Ran the real tools for ground truth** — TypeScript (`tsc`), ESLint, and `next build` were executed to see the *actual* errors.
3. **Fixed the build-blocking bug** — a stray code-fence inside a text string in `/api/chat` was silently crashing the entire build. This was the mysterious "parsing error" that appeared whenever a prompt was sent.
4. **Matched the code to the installed library** — the PDF parser was written for the old `pdf-parse` **v1** API while **v2** was installed, so every PDF silently failed. Trae rewrote it for the correct version (and added serverless packaging config).
5. **Tested the AI provider live** — the old model had been retired by OpenRouter (404), then hit a credits limit (402). Trae probed the live model catalog and switched to a working free vision model.
6. **Fixed behaviour, not just types** — the chat wasn't auto-scrolling because of a layout height issue; Trae fixed the layout *and* added a proper "scroll to bottom" mechanism.
7. **Cleaned up** — removed unused dependencies, dead files, and default template assets.
8. **Verified everything** — a clean type-check, a clean lint, a successful production build, a real PDF-parsing test, and a live chat request that returned a genuine AI answer.

In short: **the idea came from the developer; the debugging, repairs, and polish were done with Trae acting as an autonomous coding agent.**

---

## Notes & Limitations

- **No database** — all state lives in memory and resets on page refresh. Nothing about a candidate is stored.
- **Free tier limits** — OpenRouter's free models allow ~50 requests/day and can occasionally be busy.
- **Responses arrive in one shot** (no word-by-word streaming yet).
- **Voice** uses browser text-to-speech unless an `OPENAI_API_KEY` is provided for premium voices.

---

## License

This project is for personal/portfolio use.
