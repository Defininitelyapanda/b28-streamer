"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import {
  loginEmail,
  loginGoogle,
  registerEmail,
  sendPhoneOtp,
  verifyPhoneOtp,
} from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

type Tab = "email" | "phone" | "register";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh, user } = useAuth();
  const [tab, setTab] = useState<Tab>("email");
  const [accountType, setAccountType] = useState<"STREAMER" | "FILMMAKER">("STREAMER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirect = searchParams.get("redirect") ?? "/offers";

  useEffect(() => {
    if (user) router.replace(redirect);
  }, [user, router, redirect]);

  async function afterAuth() {
    await refresh();
    router.push(redirect);
  }

  const handleGoogleCredential = useCallback(
    (response: { credential: string }) => {
      setLoading(true);
      setError("");
      loginGoogle(response.credential)
        .then(async () => {
          await refresh();
          router.push(redirect);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Google sign-in failed"))
        .finally(() => setLoading(false));
    },
    [refresh, router, redirect],
  );

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await loginEmail(email, password);
      await afterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await registerEmail(email, password, displayName, accountType);
      if (res.autoVerified) {
        await loginEmail(email, password);
        await afterAuth();
      } else {
        setError("Check your email to verify, then log in.");
        setTab("email");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await sendPhoneOtp(phone);
      setOtpSent(true);
      if (res.devCode) setDevCode(res.devCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await verifyPhoneOtp(phone, otp, displayName || undefined);
      await afterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  const googleMountRef = useRef<HTMLDivElement>(null);
  const googleInitialized = useRef(false);

  const mountGoogleButton = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || googleInitialized.current || !googleMountRef.current) return;

    const win = window as Window & {
      google?: {
        accounts: {
          id: {
            initialize: (c: unknown) => void;
            renderButton: (el: HTMLElement, o: unknown) => void;
          };
        };
      };
    };

    if (!win.google?.accounts?.id) return;

    googleInitialized.current = true;
    win.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
    });
    win.google.accounts.id.renderButton(googleMountRef.current, {
      theme: "filled_black",
      size: "large",
      width: 320,
    });
  }, [handleGoogleCredential]);

  useEffect(() => {
    mountGoogleButton();
    const onReady = () => mountGoogleButton();
    window.addEventListener("b28-google-ready", onReady);
    return () => window.removeEventListener("b28-google-ready", onReady);
  }, [mountGoogleButton]);

  return (
    <div className="glass-panel mx-auto w-full max-w-md rounded-2xl p-8">
      <h1 className="mb-1 text-2xl font-bold">Welcome to B28</h1>
      <p className="mb-6 text-sm text-muted">Log in as a streamer or filmmaker</p>

      <div className="mb-6 flex gap-2">
        {(["email", "phone", "register"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`nav-btn-sm ${tab === t ? "nav-btn-active" : ""}`}
          >
            {t === "email" ? "Email" : t === "phone" ? "Phone" : "Sign up"}
          </button>
        ))}
      </div>

      {(tab === "register") && (
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            className={`nav-btn-sm flex-1 ${accountType === "STREAMER" ? "nav-btn-active" : ""}`}
            onClick={() => setAccountType("STREAMER")}
          >
            Streamer
          </button>
          <button
            type="button"
            className={`nav-btn-sm flex-1 ${accountType === "FILMMAKER" ? "nav-btn-active" : ""}`}
            onClick={() => setAccountType("FILMMAKER")}
          >
            Filmmaker
          </button>
        </div>
      )}

      {error && <p className="mb-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>}

      {tab === "email" && (
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <label className="block text-sm">
            <span className="text-muted">Email</span>
            <input
              type="email"
              required
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input mt-1 w-full"
            />
          </label>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>
      )}

      {tab === "phone" && !otpSent && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <label className="block text-sm">
            <span className="text-muted">Phone number</span>
            <input
              type="tel"
              required
              placeholder="+254712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="glass-input mt-1 w-full"
            />
          </label>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            Send code
          </button>
        </form>
      )}

      {tab === "phone" && otpSent && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          {devCode && (
            <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-muted">
              Dev code: <strong className="text-white">{devCode}</strong>
            </p>
          )}
          <label className="block text-sm">
            <span className="text-muted">Verification code</span>
            <input
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="glass-input mt-1 w-full"
            />
          </label>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            Verify & log in
          </button>
        </form>
      )}

      {tab === "register" && (
        <form onSubmit={handleRegister} className="space-y-4">
          <label className="block text-sm">
            <span className="text-muted">Display name</span>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="glass-input mt-1 w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Email</span>
            <input
              type="email"
              required
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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input mt-1 w-full"
            />
          </label>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            Create account
          </button>
        </form>
      )}

      <div className="my-6 flex items-center gap-3 text-xs text-subtle">
        <span className="h-px flex-1 bg-white/10" />
        or continue with Google
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <div ref={googleMountRef} className="flex min-h-[44px] justify-center" suppressHydrationWarning />
      {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <button
          type="button"
          disabled={loading}
          className="btn btn-secondary mt-3 w-full"
          onClick={() => {
            setLoading(true);
            const payload = btoa(JSON.stringify({ email: "demo@gmail.com", sub: "google-demo-1", name: "Demo User" }))
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/, "");
            const token = `e30.${payload}.sig`;
            loginGoogle(token)
              .then(afterAuth)
              .catch((e) => setError(e instanceof Error ? e.message : "Google failed"))
              .finally(() => setLoading(false));
          }}
        >
          Continue with Google (Demo)
        </button>
      )}

      <p className="mt-6 text-center text-xs text-subtle">
        <Link href="/" className="hover:text-white">← Back to streaming</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => {
            const event = new CustomEvent("b28-google-ready");
            window.dispatchEvent(event);
          }}
        />
      )}
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </>
  );
}
