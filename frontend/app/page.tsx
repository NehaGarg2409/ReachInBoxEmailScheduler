"use client";

import { api } from "../lib/api";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm rounded-lg border border-paper-border p-8 shadow-sm">
        <h1 className="mb-6 text-center font-display text-2xl font-semibold text-ink">Login</h1>

        <button
          onClick={() => (window.location.href = api.googleLoginUrl())}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-soft px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-brand-soft/70"
        >
          <GoogleIcon />
          Login with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-paper-border" />
          <span className="text-xs text-muted">or sign up through email</span>
          <div className="h-px flex-1 bg-paper-border" />
        </div>

        {/* Decorative only — real auth is Google OAuth via the button above. */}
        <div className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email ID"
            disabled
            className="w-full rounded bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-muted"
          />
          <input
            type="password"
            placeholder="Password"
            disabled
            className="w-full rounded bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-muted"
          />
          <button
            disabled
            title="Use Login with Google above"
            className="mt-1 w-full cursor-not-allowed rounded bg-brand/60 px-4 py-2.5 text-sm font-medium text-white"
          >
            Login
          </button>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.95a9 9 0 0 0 0 8.08l3.02-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.96l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
