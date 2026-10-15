import Link from "next/link";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth";
import { currentOwner, hasSupabaseConfig } from "@/lib/server/supabase";

const errors: Record<string, string> = {
  setup: "Cloud authentication is not configured yet.",
  oauth: "GitHub sign-in could not be started. Please try again.",
  callback: "The GitHub sign-in response could not be verified.",
  unauthorized: "This GitHub account is not authorized to manage Li Lab.",
  registration: "Your account was verified, but the private workspace could not be registered."
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string; signedOut?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const owner = await currentOwner();
  if (owner && owner.id !== "demo-owner") redirect(next);
  const configured = hasSupabaseConfig();
  const message = params.error ? errors[params.error] ?? "Sign-in failed." : params.signedOut ? "You have signed out safely." : "";

  return (
    <main className="page narrow auth-page">
      <section className="auth-panel">
        <div className="stack">
          <div className="eyebrow">PRIVATE OWNER ACCESS</div>
          <h1>Manage Li Lab</h1>
          <p>Sign in with the authorized GitHub account to edit Methods drafts, run paper analysis, and update Research Radar settings.</p>
        </div>
        <div className="auth-actions">
          {message ? <p className={params.signedOut ? "auth-message" : "auth-message error"} role="status">{message}</p> : null}
          {configured ? (
            <a className="button primary" href={`/auth/github?next=${encodeURIComponent(next)}`}>Continue with GitHub →</a>
          ) : (
            <div className="auth-setup">
              <div className="meta">{process.env.NODE_ENV === "production" ? "SETUP REQUIRED" : "LOCAL DEMO MODE"}</div>
              <p>{process.env.NODE_ENV === "production" ? "Add the Supabase environment variables before enabling owner sign-in." : "Authentication is bypassed only in local development. Cloud deployments remain locked until Supabase is configured."}</p>
              {process.env.NODE_ENV !== "production" ? <Link className="button primary" href={next}>Enter local workspace →</Link> : null}
            </div>
          )}
          <Link className="text-link" href="/">← Return to the public site</Link>
        </div>
      </section>
      <aside className="auth-note">
        <div className="meta">OWNER-ONLY REGISTRATION</div>
        <p>The first successful login creates the private member record automatically. Public account registration is disabled.</p>
      </aside>
    </main>
  );
}
