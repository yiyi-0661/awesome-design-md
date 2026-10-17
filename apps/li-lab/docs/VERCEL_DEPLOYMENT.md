# Vercel + Supabase setup

## 1. Create the Supabase project

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. In Authentication → Providers → GitHub, copy the Supabase provider callback URL.
3. Create a GitHub OAuth App with that Supabase callback URL, then paste its Client ID and Client Secret into Supabase.
4. In Supabase Authentication URL configuration, set the production Site URL and add both production and preview `/auth/callback` URLs to the redirect allow list.

The browser returns to Li Lab at `/auth/callback`; GitHub itself returns to the Supabase URL shown by the provider configuration.

## 2. Import the Vercel project

1. Import `yiyi-0661/awesome-design-md` into Vercel.
2. Set Root Directory to `apps/li-lab`.
3. Keep the detected Next.js build settings.
4. Add the variables below to Preview and Production, using different Supabase projects if strict environment isolation is required.

## 3. Environment variables

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe | Preferred public Supabase key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe fallback | Legacy public Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Owner registration and trusted server writes |
| `OWNER_GITHUB_ID` | Server | Numeric GitHub ID allowed to manage Li Lab |
| `RADAR_SHARED_SECRET` | Secret | HMAC authentication with Chem Research Radar |
| `LLM_API_KEY` | Secret | DeepSeek-compatible API key |
| `LLM_BASE_URL` | Server | Defaults to `https://api.deepseek.com` |
| `LLM_MODEL` | Server | Deployed model name |
| `LLM_MAX_OUTPUT_TOKENS` | Server | Structured analysis output ceiling |
| `OPENALEX_API_KEY` | Secret, optional | Literature lookup quota |
| `CROSSREF_POLITE_EMAIL` | Server, optional | Crossref polite-pool identity |

Never copy `.env.local` into Git or expose a service-role, Radar, or model key with a `NEXT_PUBLIC_` prefix.

## 4. Verify before production

Run locally:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Then test the Vercel preview using the checklist in `docs/VERCEL_AUTH_PLAN.md`. Promote only the verified preview.
