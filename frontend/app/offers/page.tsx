"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  addPaymentMethod,
  getSubscriptionOffers,
  listPaymentMethods,
  subscribe,
  SubscriptionOffers,
  PaymentMethod,
} from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { buildLoginUrl } from "@/lib/streaming-access";

function OffersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { user, subscription, loading, setSubscription } = useAuth();
  const [offers, setOffers] = useState<SubscriptionOffers | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("MONTHLY");
  const [payType, setPayType] = useState<"MPESA" | "PAYPAL" | "CARD">("MPESA");
  const [payLabel, setPayLabel] = useState("");
  const [payDetail, setPayDetail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSubscriptionOffers().then(setOffers).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      listPaymentMethods().then(setMethods).catch(() => setMethods([]));
    } else {
      setMethods([]);
    }
  }, [user]);

  const continueUrl = redirectParam ?? "/browse";
  const signupRedirect = buildLoginUrl({
    redirect: redirectParam,
    mode: "signup",
    persona: "streamer",
  });
  const signinRedirect = buildLoginUrl({
    redirect: redirectParam,
    persona: "streamer",
  });

  async function linkPayment() {
    if (!user) {
      router.push(signupRedirect);
      return;
    }
    if (!payLabel.trim()) return;
    setBusy(true);
    try {
      const m = await addPaymentMethod({
        type: payType,
        label: payLabel,
        last4: payType === "CARD" ? payDetail.slice(-4) : undefined,
        phone: payType === "MPESA" ? payDetail : undefined,
        isDefault: methods.length === 0,
      });
      setMethods((prev) => [...prev, m]);
      setPayLabel("");
      setPayDetail("");
      setMsg("Payment method linked.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to link payment");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubscribe() {
    if (!user) {
      router.push(signupRedirect);
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const defaultMethod = methods.find((m) => m.isDefault) ?? methods[0];
      const sub = await subscribe(selectedPlan, defaultMethod?.id);
      await setSubscription(sub);
      setMsg("Welcome to B28 — you're ready to stream!");
      router.push(continueUrl);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Subscription failed");
    } finally {
      setBusy(false);
    }
  }

  const currency = offers?.currency ?? "KES";
  const greeting = user
    ? redirectParam
      ? `Almost there — pick a plan to start watching.`
      : `Hi ${user.displayName ?? user.email.split("@")[0]} — subscribe to watch films and series on B28.`
    : "Create an account or sign in, then choose a plan to start streaming.";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Choose your plan</h1>
      <p className="mb-8 text-muted">{greeting}</p>

      {!user && !loading && (
        <div className="glass-panel mb-8 rounded-xl border border-white/10 p-4 text-sm text-muted">
          <Link href={signupRedirect} className="text-accent underline">
            Create account
          </Link>{" "}
          or{" "}
          <Link href={signinRedirect} className="text-accent underline">
            sign in
          </Link>{" "}
          to link a payment method and subscribe.
        </div>
      )}

      {subscription?.isPremium && (
        <div className="glass-panel mb-8 rounded-xl border border-green-500/30 p-4 text-green-300">
          You&apos;re on <strong>{subscription.plan}</strong> until{" "}
          {subscription.expiresAt
            ? new Date(subscription.expiresAt).toLocaleDateString()
            : "renewal"}
          .
          <Link href={continueUrl} className="ml-2 underline">
            Continue
          </Link>
        </div>
      )}

      {msg && <p className="mb-4 text-sm text-accent">{msg}</p>}

      <div className="mb-10 grid gap-4 md:grid-cols-2">
        {offers ? (
          <>
            <button
              type="button"
              onClick={() => setSelectedPlan("MONTHLY")}
              className={`glass-panel rounded-2xl p-6 text-left transition ${
                selectedPlan === "MONTHLY" ? "ring-2 ring-accent" : ""
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-accent">Monthly</p>
              <p className="mt-2 text-3xl font-black">
                {currency} {offers.monthly.price}
              </p>
              <p className="mt-2 text-sm text-muted">Full-quality streaming, cancel anytime</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan("ANNUAL")}
              className={`glass-panel rounded-2xl p-6 text-left transition ${
                selectedPlan === "ANNUAL" ? "ring-2 ring-accent" : ""
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-accent">Annual</p>
              <p className="mt-2 text-3xl font-black">
                {currency} {offers.annual.price}
              </p>
              <p className="mt-2 text-sm text-muted">
                Save {offers.annual.discountPercent}% · best value
              </p>
            </button>
          </>
        ) : (
          <p className="text-muted md:col-span-2">Loading plans…</p>
        )}
      </div>

      {user && (
        <section className="glass-panel mb-8 rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Link a payment method</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            {(["MPESA", "PAYPAL", "CARD"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPayType(t)}
                className={`nav-btn-sm ${payType === t ? "nav-btn-active" : ""}`}
              >
                {t === "MPESA" ? "M-Pesa" : t === "CARD" ? "Visa / Card" : "PayPal"}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Label (e.g. My M-Pesa)"
              value={payLabel}
              onChange={(e) => setPayLabel(e.target.value)}
              className="glass-input"
            />
            <input
              placeholder={
                payType === "MPESA"
                  ? "Phone number"
                  : payType === "CARD"
                    ? "Card number"
                    : "PayPal email"
              }
              value={payDetail}
              onChange={(e) => setPayDetail(e.target.value)}
              className="glass-input"
            />
          </div>
          <button type="button" onClick={linkPayment} disabled={busy} className="btn btn-secondary mt-4">
            Link payment method
          </button>

          {methods.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {methods.map((m) => (
                <li key={m.id} className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
                  <span>
                    {m.type} — {m.label}
                    {m.last4 ? ` •••• ${m.last4}` : ""}
                  </span>
                  {m.isDefault && <span className="text-accent">Default</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={handleSubscribe}
        disabled={busy || subscription?.isPremium === true}
        className="btn btn-primary w-full md:w-auto"
      >
        {user ? "Subscribe & start watching" : "Create account to subscribe"}
      </button>
    </div>
  );
}

export default function OffersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted">Loading plans…</p>
        </div>
      }
    >
      <OffersContent />
    </Suspense>
  );
}
