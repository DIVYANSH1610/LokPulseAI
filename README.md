# LokPulse AI — MVP Build

This is a working scaffold of the architecture described in the project spec:
FastAPI backend running the full agent pipeline (Sections 5.1–5.8), SQLite/SQLAlchemy
persistence (matching the schema in Section 7), and a Next.js dashboard (Section 9's
key cards). It runs end-to-end right now, with or without any LLM provider key
configured — Gemini, Mistral, and HuggingFace are all supported, tried in that
order, with graceful fallback between them (see `backend/integrations/llm_client.py`).

## What's actually implemented

- **All 8 agents** as real, callable modules: voice (transcribe), translation,
  vision (incl. EXIF geolocation extraction), classification, duplicate
  detection (both automatic-dedup and citizen-upvote paths), hotspot
  detection (grid-density, deterministic), priority ranking (deterministic
  scoring formula, fully auditable), and RAG-grounded recommendation
  generation.
- **A real orchestration graph** (`backend/graph/pipeline.py`) chaining every
  agent in order, matching the flow diagram in Section 2.
- **A working FastAPI backend** with endpoints for citizen submission, the
  upvote-before-you-submit flow, browse-nearby, MP dashboard (top priorities,
  heatmap, live slider re-ranking), recommendation regeneration,
  cross-constituency implementation tracking, and ward-level
  panchayat annotation.
- **All five role-based frontend views** from Section 3:
  - **MP Office** (`/dashboard`): Top Urgent Issues with expand-to-reasoning,
    live heatmap, draggable priority weight sliders that re-rank in real time.
  - **Citizen** (`/submit`, `/browse`, `/status`): report an issue (with a
    proactive "N people already reported this — upvote instead?" check
    before submitting), browse nearby issues to upvote directly, and track
    your own submission status — all keyed to a per-browser pseudo-ID
    (`lib/citizen.ts`) standing in for phone-OTP auth.
  - **District Administration** (`/district`): cross-constituency rollup
    cards plus an implementation tracker table where status
    (new → under_review → recommended → actioned → resolved) can be updated.
  - **Panchayat Officer** (`/panchayat`): ward-level detail view with
    ground-truth annotation (e.g. "land already allocated") — no budget
    approval action exposed, matching the Section 3 permissions table.
  - **MLA Office**: intentionally reuses the MP dashboard UI unscoped for
    now — real scoping to an assembly-segment subset needs assembly-segment
    boundary data this build doesn't seed yet.
- **Seed data**: 10 real-shaped Lucknow ward profiles (population, SC/ST %,
  distance to nearest PHC/school, literacy, flood-proneness) and 10 sample
  multi-channel citizen submissions that exercise dedup, clustering, and
  scoring.
- **`.env` file support** (`python-dotenv`): copy `backend/.env.example` to
  `backend/.env` and set `GEMINI_API_KEY` once — no more re-exporting it
  every terminal session.
- **A full marketing landing page** at `/` — hero section, stats bar,
  "how it works" steps, feature grid, and role-entry cards, styled after
  the clean, editorial, whitespace-heavy visual language common to premium
  health-tech/biotech sites (large bold headline, restrained navy/teal
  palette, generous spacing, stat callouts) rather than a startup-flashy
  template.
- **Site-wide multilingual support** — not just translated content, but a
  full language switcher (`components/LanguageSwitcher.tsx`) that changes
  the entire interface's copy *and* font stack instantly. English and Hindi
  are fully wired (`lib/i18n/en.ts`, `hi.ts`); Bengali, Tamil, and Telugu are
  scaffolded (`lib/i18n/languages.ts`) as "coming soon" so extending later is
  just adding a dictionary file and flipping one flag. Each script gets its
  own typeface (e.g. Noto Sans Devanagari for Hindi) via CSS font-family
  fallback chains — Latin fonts render Devanagari/Bengali/Tamil/Telugu
  poorly, so this isn't just a font-size tweak.
- **A mock-mode fallback for every Gemini call.** With no `GEMINI_API_KEY`
  set, the pipeline still runs completely — translation, vision,
  classification, and recommendation agents all return clearly-labeled
  `[MOCK]` structured output so you can demo the full flow before wiring in
  a real key. Embeddings fall back to a deterministic hash-based vector
  (good enough to prove the pipeline wiring; **not** good enough for real
  duplicate-detection quality — that needs the real `gemini-embedding-001`
  calls).
- **A real RAG knowledge base** (`backend/rag/knowledge_store.py`,
  `db.models.KnowledgeDocument`), replacing the old deterministic
  `SCHEME_LOOKUP` dict in the Recommendation Agent with genuine chunk +
  embed + cosine-similarity retrieval over `data/knowledge/schemes/*.md`
  (seven government schemes: PMGSY, ABHIM, Samagra Shiksha, Jal Jeevan
  Mission, DDUGJY, Swachh Bharat Mission, PMKSY). Same retrieval function
  also powers Ask AI below — one RAG seam, two consumers.
- **Multi-provider LLM support** (`backend/integrations/llm_client.py`):
  Gemini, Mistral, and HuggingFace (Inference API) are all wired in, tried
  in that order based on which API key(s) are set in `.env`. If a
  configured provider fails mid-request (rate limit, transient error),
  the call falls through to the next configured provider rather than
  failing outright. Falls back to clearly-labeled `[MOCK]` output if none
  are configured. Note: embeddings from different providers are **not**
  comparable to each other — pin one provider's key for embeddings in
  production rather than relying on the fallback chain there specifically
  (see the docstring on `embed_text` for why).
- **Public Dataset Advisor** (`backend/integrations/bigquery_client.py`):
  a curated catalog mapping each issue category to real data.gov.in /
  government open-data sources (NFHS-5, HMIS, PMGSY, UDISE+, Jal Jeevan
  Mission dashboard, Saubhagya, SBM(G), CPCB AQI, Census), each tagged
  with `integration_status` and exactly what `work_needed` remains to
  wire it in live via BigQuery. Surfaced three ways: `GET
  /datasets/suggest?category=...`, appended (deterministically, never
  LLM-generated) to every Recommendation Agent output as
  `suggested_datasets`, and folded into Ask AI's live context for
  official roles so "what data would strengthen this?" gets a real
  answer. `refresh_ward_profiles_from_bigquery()` is the live-pull path —
  a safe no-op until `BIGQUERY_PROJECT_ID` is set, so it's always callable
  without a preceding "is this configured" check.
- **Ask AI** (`components/AskAI.tsx`, `agents/assistant_agent.py`,
  `POST /assistant/ask`): a floating assistant present on every page,
  mounted once in `layout.tsx` so it persists across navigation. Role and
  page context are inferred automatically from the current route (no
  login/role-picker needed) — a citizen on `/submit` gets citizen
  onboarding help; an MP Office user on `/dashboard` gets dashboard
  guidance *plus* a live snapshot of their actual top-ranked issues (and
  relevant dataset suggestions for that issue's category) injected as
  grounding, so "what's our top priority right now" gets a real, current
  answer instead of a generic description of the UI. Grounded in
  `data/knowledge/help/*.md` (one guide per role + a `general` platform
  overview used as fallback context), with the same "don't invent data"
  constraint as the Recommendation Agent.

## What's stubbed / needs real credentials to go further

- **Google Maps Platform**: the frontend heatmap is a lightweight SVG
  scatter plot standing in for a real Maps overlay. The data shape
  (`lat`, `lng`, `weight`, `dominant_category`) returned by
  `/dashboard/heatmap` is already Maps-ready.
- **WhatsApp Business API / SMS gateway**: submission intake accepts a
  `channel` field and stores channel breakdown, but there's no real Twilio/
  WhatsApp webhook wired up yet — `POST /submissions` is the integration
  point.
- **Cloud Speech-to-Text**: `voice_agent.py` has the real implementation
  sketched in a comment; needs `google-cloud-speech` + credentials.
- **BigQuery / Firebase**: ward profiles and users currently live in
  SQLite for zero-setup local running. `refresh_ward_profiles_from_bigquery()`
  is written and safe to call, but stays a no-op until `BIGQUERY_PROJECT_ID`
  is set and a real joined dataset exists in BigQuery (see
  `DATASET_CATALOG` in `backend/integrations/bigquery_client.py` for
  exactly which source datasets to join first). Swapping `DATABASE_URL`
  to a Postgres/Neon connection string with pgvector enabled is the
  separate, documented upgrade path for the embeddings tables (see
  comments in `backend/db/models.py`) — this also upgrades
  `KnowledgeDocument` retrieval (Ask AI + scheme grounding) from a linear
  cosine-similarity scan to an indexed vector search.
- **Duplicate root-level scaffold**: this repo currently has an older
  `app/`, `components/`, `lib/` scaffold at the repo root (pre-dating the
  real Next.js app under `frontend/`) alongside a root `package.json` and
  `pnpm-lock.yaml`. `npm run build` inside `frontend/` already warns about
  this (multiple lockfiles confusing workspace-root detection). It's
  harmless today since nothing imports from the root scaffold, but worth
  deleting the root-level `app/`, `components/`, `lib/`,
  `pnpm-lock.yaml`, and root `package.json` once you confirm `frontend/`
  is the only app you're deploying, to avoid deployment tooling picking
  the wrong root.
- **Ask AI's live-data scope for Panchayat Officers**: the assistant knows
  the officer's role from the route, but doesn't yet know *which ward*
  they've selected in the page's own dropdown (that's local component
  state, not shared globally). It still answers ward-level guidance
  questions correctly; it just can't cite "your ward's top issue" until
  the selected ward is lifted into shared state or the URL.

## Running it

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\Activate.ps1
pip install -r requirements.txt --break-system-packages   # or: uv pip install -r requirements.txt
cp .env.example .env        # optional: fill in GEMINI_API_KEY to use real AI instead of mocks
python seed.py               # loads ward profiles + sample submissions, runs full pipeline
python scripts/ingest_knowledge.py   # embeds data/knowledge/*.md into the RAG table (schemes + Ask AI help docs)
python -m uvicorn main:app --reload --port 8000
```

If plain `uvicorn ...` isn't found on your PATH, use `python -m uvicorn ...` instead — it always works.

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local   # points at http://localhost:8000 by default
npm run dev
```

Visit `http://localhost:3000` — pick "MP Office" to see the live dashboard.

## Notes on the frontend build

This sandbox has no network access to Google Fonts, so `layout.tsx` and
`globals.css` currently define the IBM Plex Sans / IBM Plex Mono / Source
Serif 4 font stack via plain CSS `font-family` rather than `next/font/google`.
In your own environment (which will have internet access), you can restore
`next/font/google` for self-hosted, zero-layout-shift font loading — see the
comment at the top of `layout.tsx` for exactly what to swap back in.

## Next steps (matches the Roadmap in the original spec)

1. Wire a real `GEMINI_API_KEY` and confirm classification/dedup quality
   improves (mock mode currently classifies everything as "Road" — this is
   a mock artifact, not a pipeline bug).
2. Swap SQLite → Postgres/Neon with pgvector for the embedding columns
   (submissions, issue clusters, and the new `KnowledgeDocument` table).
3. Wire one real public dataset live via BigQuery (Section 8 recommends
   district school/PHC locations, since it directly powers the
   distance-to-facility number).
4. Add the citizen-facing WhatsApp/SMS webhook (the web submit flow
   already exists at `/submit`).
5. Lift the Panchayat Officer's selected ward into shared state so Ask AI
   can cite it directly (see the note under "What's stubbed" above).
6. Expand `data/knowledge/schemes/*.md` with real scheme PDFs (chunked)
   once available, and `data/knowledge/help/*.md` with real user-tested
   FAQ content as citizens/officials actually use the platform.
7. Deploy backend to Cloud Run, frontend to Vercel or Firebase Hosting.
