# Vercel deployment and owner authentication plan

## Product decision

Li Lab remains a public research site with an owner-only management workspace.

- Public without login: Home, Research, published Methods, method detail, and About.
- Owner-only: Analysis, Updates, Methods Drafts, and Methods New.
- Registration and login use GitHub OAuth through Supabase Auth.
- The GitHub account whose numeric ID matches `OWNER_GITHUB_ID` is the only account allowed to register as a member.
- The first successful owner login upserts the private `members` row. There is no public sign-up form.
- Local development keeps the existing explicit demo-owner bypass only when Supabase is not configured. Production fails closed.

## Request flow

1. A protected route redirects a guest to `/login?next=<local-path>`.
2. `/auth/github` starts the Supabase PKCE GitHub flow.
3. GitHub returns through Supabase, which redirects to `/auth/callback`.
4. The callback exchanges the code for a cookie session and verifies the trusted GitHub provider ID.
5. The service-role client creates or updates the owner membership record.
6. The user returns only to a validated local path. External redirect targets are rejected.
7. `proxy.ts` refreshes sessions and performs the optimistic route check; protected layouts and API handlers repeat authorization close to the data operation.

## Deployment design

- Git source: `yiyi-0661/awesome-design-md`.
- Vercel Root Directory: `apps/li-lab`.
- Framework preset: Next.js.
- Package manager: pnpm, detected from `pnpm-lock.yaml` in the app root.
- Preview deployments are validated before promotion to Production.
- Supabase stores membership, Research issues, Radar settings, and later cloud-backed Methods/Analysis records.
- Secrets are server-only. `SUPABASE_SERVICE_ROLE_KEY`, `RADAR_SHARED_SECRET`, and model keys must never use a `NEXT_PUBLIC_` prefix.

## Test plan

### Static and unit checks

- Lint, TypeScript, Vitest, and production build must pass.
- Redirect validation accepts only paths beginning with one `/`.
- GitHub provider ID extraction and owner comparison are covered by unit tests.
- Production build succeeds without committing `.env.local` or Vercel metadata.

### Authentication integration checks

- Guest can open every public page.
- Guest opening each protected page is redirected to Login with the original local destination preserved.
- The configured GitHub owner can sign in, refresh a protected page, and sign out.
- A different GitHub account is signed out and receives a clear unauthorized message.
- First owner login creates one enabled `members` row; repeated login is idempotent.
- Direct calls to protected admin and Analysis APIs return 401 without an owner session.
- OAuth failure, missing callback code, missing production configuration, and member-registration failure all fail closed.

### Vercel preview checks

- Preview uses its own allowed Supabase redirect URL.
- No secret appears in browser JavaScript, rendered HTML, or Vercel build logs.
- Public pages, mobile layout, GitHub login, logout, Analysis upload, Update save, and Draft entry are smoke tested.
- A signed Radar issue POST is accepted and same-date replacement is visible in Research.
- Only after preview passes is the deployment promoted to Production.

### Rollback

- Database changes remain additive.
- Keep the previous successful Vercel deployment available for instant rollback.
- Do not rotate or remove old credentials until the production smoke test passes.
