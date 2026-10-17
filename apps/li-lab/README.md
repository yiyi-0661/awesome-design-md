# Li Lab

The production-oriented Next.js implementation of the locked Li Lab v0 design.

## Included

- Responsive Home, Research, Methods, Analysis, Updates, and About pages.
- Animated DNA hero with reduced-motion support.
- Public weekly Research archive and permanent issue pages.
- HMAC-authenticated Radar preference and issue APIs with five-minute timestamp validation and idempotent ingestion.
- Split Markdown editor with sanitized GFM, math, local autosave, publishing, and Analysis-to-Methods drafts.
- Three-part paper analysis workspace with real PDF extraction, verified Crossref/OpenAlex candidates, and DeepSeek structured analysis: Core Method, Reference Origins, and Related Papers.
- Supabase schema with row-level security, member isolation, revision history, quota records, and private analysis storage.
- Owner-only GitHub OAuth with protected Analysis, Updates, and Methods Draft routes.
- Explicit local demo mode when cloud credentials are absent.

## Run locally

```bash
pnpm install
pnpm dev
```

Without environment variables Research, Methods, and Updates retain their local workspace behavior; Analysis reports `SETUP REQUIRED` and will not pretend to analyze a PDF. Copy `.env.example` to `.env.local` and configure DeepSeek to enable the real Analysis data path. See [`ANALYSIS_SETUP.md`](./docs/ANALYSIS_SETUP.md).

## Cloud setup

1. Apply `supabase/schema.sql` to a Supabase project and enable GitHub OAuth.
2. Copy `.env.example` to `.env.local` and fill in server-only keys. Never expose the service role, Radar secret, or model keys with a `NEXT_PUBLIC_` prefix.
3. Configure `chem-research-radar` to sign the exact request bytes using:

   `HMAC_SHA256(secret, timestamp + "." + method + "." + path + "." + SHA256(body))`

4. Read preferences from `GET /api/internal/radar/preferences` and publish the canonical digest to `POST /api/internal/radar/issues` with `x-radar-timestamp` and `x-radar-signature` headers.

The Research and Updates data paths switch to Supabase automatically when both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present. Analysis runs directly in the Node.js route handler and requires `LLM_API_KEY`. PDFs are parsed in request memory, extracted text is sent to DeepSeek only after explicit per-upload consent, and the uploaded file is not persisted by Li Lab.

Detailed owner-auth and Vercel setup: [`VERCEL_AUTH_PLAN.md`](./docs/VERCEL_AUTH_PLAN.md) and [`VERCEL_DEPLOYMENT.md`](./docs/VERCEL_DEPLOYMENT.md).

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Vercel project root: `apps/li-lab`.
