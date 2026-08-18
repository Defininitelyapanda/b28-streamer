"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Script from "next/script";
import { registerEmail, sendPhoneOtp } from "@/lib/api-client";

type Tab = "email" | "phone" | "register";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
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

  const redirect = searchParams.get("redirect") ?? "/";

  useEffect(() => {
    if (status === "authenticated") router.replace(redirect);
  }, [status, router, redirect]);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push(redirect);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await registerEmail(email, password, displayName, accountType);
      if (res.autoVerified) {
        const result = await signIn("credentials", { email, password, redirect: false });
        if (result?.error) {
          setError("Account created but login failed");
          return;
        }
        router.push(redirect);
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
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
      const res = await fetch(`${apiBase}/auth/phone/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp, displayName: displayName || undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);

      const result = await signIn("credentials", {
        accessToken: json.data.accessToken,
        refreshToken: json.data.refreshToken,
        redirect: false,
      });
      if (result?.error) {
        setError("Verification succeeded but session failed");
        return;
      }
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleCredential = useCallback(
    async (response: { credential: string }) => {
      setLoading(true);
      setError("");
      const result = await signIn("credentials", {
        idToken: response.credential,
        redirect: false,
      });
      setLoading(false);
      if (result?.error) {
        setError("Google sign-in failed");
        return;
      }
      router.push(redirect);
    },
    [router, redirect],
  );

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
    <>
      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => {
            window.dispatchEvent(new CustomEvent("b28-google-ready"));
          }}
        />
      )}
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
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

          {tab === "register" && (
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

          {error && (
            <p className="mb-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
          )}

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
              onClick={async () => {
                setLoading(true);
                const payload = btoa(
                  JSON.stringify({ email: "demo@gmail.com", sub: "google-demo-1", name: "Demo User" }),
                )
                  .replace(/\+/g, "-")
                  .replace(/\//g, "_")
                  .replace(/=+$/, "");
                const token = `e30.${payload}.sig`;
                const result = await signIn("credentials", { idToken: token, redirect: false });
                setLoading(false);
                if (result?.error) {
                  setError("Google failed");
                  return;
                }
                router.push(redirect);
              }}
            >
              Continue with Google (Demo)
            </button>
          )}
        </div>
      </div>
    </>
  );
}
