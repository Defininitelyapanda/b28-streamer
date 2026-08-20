"use client";

import { useEffect, useRef, useState } from "react";
import { getSession, signIn, signOut } from "next-auth/react";
import { registerEmail, getMyFilmmakerApplication } from "@/lib/api-client";
import {
  personaToAccountType,
  resolvePostAuthRedirect,
  type Persona,
} from "@/app/login/login-utils";
import { hasFilmmakerAccess } from "@/lib/streaming-access";
import { useAutofillField } from "@/app/login/useAutofillField";

type AuthMode = "signin" | "signup";

interface AuthDialogProps {
  persona: Persona;
  redirectParam: string | null;
  onBack: () => void;
  onSuccess: (url: string) => void;
  onMismatch: (message: string) => void;
}

function devDefaultEmail(persona: Persona) {
  return persona === "streamer" && process.env.NODE_ENV === "development"
    ? "admin.123@b28.dev"
    : "";
}

function devDefaultPassword(persona: Persona) {
  return persona === "streamer" && process.env.NODE_ENV === "development" ? "1234" : "";
}

export default function AuthDialog({
  persona,
  redirectParam,
  onBack,
  onSuccess,
  onMismatch,
}: AuthDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<AuthMode>("signin");
  const emailField = useAutofillField(devDefaultEmail(persona));
  const passwordField = useAutofillField(devDefaultPassword(persona));
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const titleId = "auth-dialog-title";
  const isFilmmaker = persona === "filmmaker";
  const isSignUp = mode === "signup";
  const emailInputId = `${persona}-${mode}-email`;
  const passwordInputId = `${persona}-${mode}-password`;
  const displayNameInputId = `${persona}-signup-display-name`;

  function resolveCredentials() {
    const email = emailField.inputRef.current?.value ?? emailField.value;
    const password = passwordField.inputRef.current?.value ?? passwordField.value;
    emailField.setValue(email);
    passwordField.setValue(password);
    return { email, password };
  }

  useEffect(() => {
    const node = dialogRef.current;
    const form = formRef.current;
    if (!node || !form) return;

    if (!form.contains(document.activeElement)) {
      emailField.inputRef.current?.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onBack();
        return;
      }
      if (e.key !== "Tab" || !node) return;

      const focusable = node.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onBack, mode, persona, emailField.inputRef]);

  async function waitForSession(maxAttempts = 15) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const session = await getSession();
      if (session?.user?.id && session?.accessToken) return session;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    return getSession();
  }

  async function completeSignIn(authMode: AuthMode) {
    const session = await waitForSession();
    const roles = session?.user?.roles ?? [];

    let hasFilmmakerApplication = false;
    if (persona === "filmmaker" && authMode === "signin" && !hasFilmmakerAccess(roles)) {
      try {
        const application = await getMyFilmmakerApplication();
        hasFilmmakerApplication = application !== null;
      } catch {
        hasFilmmakerApplication = false;
      }
    } else if (persona === "filmmaker" && authMode === "signup") {
      hasFilmmakerApplication = true;
    }

    const result = resolvePostAuthRedirect(persona, roles, session?.subscription ?? null, {
      redirectParam,
      authMode,
      hasFilmmakerApplication,
    });

    if (result.stayOnLogin && result.warning) {
      await signOut({ redirect: false });
      onMismatch(result.warning);
      return;
    }

    onSuccess(result.url);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    const { email, password } = resolveCredentials();

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "Configuration") {
          setError("Auth is misconfigured. Set AUTH_SECRET in your environment.");
        } else if (result.error === "CredentialsSignin") {
          setError("Invalid email or password.");
        } else {
          setError("Sign in failed. The API may be unavailable — try again in a moment.");
        }
        return;
      }

      if (!result?.ok) {
        setError("Sign in failed. Please try again.");
        return;
      }

      await completeSignIn("signin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    const { email, password } = resolveCredentials();

    try {
      const accountType = personaToAccountType(persona);
      const response = await registerEmail(email, password, displayName.trim(), accountType);

      if (response.autoVerified) {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setInfo("Account created. Please sign in with your new credentials.");
          setMode("signin");
          return;
        }

        await completeSignIn("signup");
        return;
      }

      setInfo("Registration successful. Check your email to verify, then sign in.");
      setMode("signin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const headline = isSignUp
    ? isFilmmaker
      ? "Create filmmaker account"
      : "Join B28"
    : isFilmmaker
      ? "Filmmaker sign in"
      : "Welcome back";

  const subtitle = isSignUp
    ? isFilmmaker
      ? "Start distributing your films on B28."
      : "Subscribe to stream Kenyan films and originals."
    : isFilmmaker
      ? "Access your filmmaker hub."
      : "Sign in to browse and watch on B28.";

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="glass-panel mx-auto w-full max-w-md animate-login-dialog rounded-2xl p-8"
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-muted transition hover:text-white"
      >
        ← Back
      </button>

      <h2 id={titleId} className="text-2xl font-bold">
        {headline}
      </h2>
      <p className="mb-6 text-sm text-muted">{subtitle}</p>

      <div className="mb-6 flex rounded-full border border-white/10 bg-white/[0.03] p-1">
        {(["signin", "signup"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setMode(tab);
              setError("");
              setInfo("");
              setShowPassword(false);
            }}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
              mode === tab ? "bg-accent text-white shadow-md" : "text-muted hover:text-white"
            }`}
          >
            {tab === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
      )}
      {info && (
        <p className="mb-4 rounded-lg bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          {info}
        </p>
      )}

      {loading && (
        <div className="mb-4 h-0.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse bg-accent" />
        </div>
      )}

      <form
        ref={formRef}
        key={`${persona}-${mode}`}
        autoComplete={isSignUp ? "off" : "on"}
        onSubmit={isSignUp ? handleSignUp : handleSignIn}
        className="space-y-4"
      >
        {isSignUp && (
          <label htmlFor={displayNameInputId} className="block text-sm">
            <span className="text-muted">Display name</span>
            <input
              id={displayNameInputId}
              name="displayName"
              type="text"
              required
              minLength={1}
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="glass-input login-autofill-input mt-1 w-full"
            />
          </label>
        )}

        <label htmlFor={emailInputId} className="block text-sm">
          <span className="text-muted">Email</span>
          <input
            ref={emailField.inputRef}
            id={emailInputId}
            name={isSignUp ? "email" : "username"}
            type="email"
            required
            autoComplete={isSignUp ? "email" : "username"}
            readOnly={emailField.readOnly}
            value={emailField.value}
            onChange={emailField.onChange}
            onInput={emailField.onInput}
            onFocus={emailField.onFocus}
            onAnimationStart={emailField.onAutofillAnimationStart}
            className="glass-input login-autofill-input mt-1 w-full"
          />
        </label>

        <label htmlFor={passwordInputId} className="block text-sm">
          <span className="text-muted">Password</span>
          <div className="relative mt-1">
            <input
              ref={passwordField.inputRef}
              id={passwordInputId}
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={isSignUp ? 8 : 1}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              readOnly={passwordField.readOnly}
              value={passwordField.value}
              onChange={passwordField.onChange}
              onInput={passwordField.onInput}
              onFocus={passwordField.onFocus}
              onAnimationStart={passwordField.onAutofillAnimationStart}
              className="glass-input login-autofill-input w-full pr-11"
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted transition hover:text-white"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading
            ? isSignUp
              ? "Creating account…"
              : "Signing in…"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      {mode === "signin" && persona === "streamer" && process.env.NODE_ENV === "development" && (
        <p className="mt-6 text-center text-xs text-subtle">Demo: admin.123@b28.dev / 1234</p>
      )}
    </div>
  );
}
