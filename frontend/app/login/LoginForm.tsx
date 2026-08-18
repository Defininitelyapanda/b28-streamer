"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [email, setEmail] = useState("admin.123@b28.dev");
  const [password, setPassword] = useState("1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirect = searchParams.get("redirect") ?? "/";

  useEffect(() => {
    if (status === "authenticated") router.replace(redirect);
  }, [status, router, redirect]);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "Configuration") {
          setError("Auth is misconfigured. Set AUTH_SECRET in your environment.");
        } else {
          setError("Invalid email or password. Make sure the backend is running.");
        }
        return;
      }

      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="glass-panel mx-auto w-full max-w-md rounded-2xl p-8">
        <h1 className="mb-1 text-2xl font-bold">Welcome to B28</h1>
        <p className="mb-6 text-sm text-muted">Sign in to start streaming</p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <label className="block text-sm">
            <span className="text-muted">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input mt-1 w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input mt-1 w-full"
            />
          </label>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-subtle">
          Demo: admin.123@b28.dev / 1234
        </p>
      </div>
    </div>
  );
}
