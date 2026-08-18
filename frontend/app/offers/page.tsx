"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  addPaymentMethod,
  continueWithAds,
  getSubscriptionOffers,
  listPaymentMethods,
  subscribe,
  SubscriptionOffers,
  PaymentMethod,
} from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export default function OffersPage() {
  const router = useRouter();
  const { user, subscription, loading, refresh, setSubscription } = useAuth();
  const [offers, setOffers] = useState<SubscriptionOffers | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("MONTHLY");
  const [payType, setPayType] = useState<"MPESA" | "PAYPAL" | "CARD">("MPESA");
  const [payLabel, setPayLabel] = useState("");
  const [payDetail, setPayDetail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/offers");
  }, [user, loading, router]);

  useEffect(() => {
    getSubscriptionOffers().then(setOffers).catch(() => {});
    if (user) {
      listPaymentMethods().then(setMethods).catch(() => setMethods([]));
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted">Loading plans…</p>
      </div>
    );
  }

  async function linkPayment() {
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
    setBusy(true);
    setMsg("");
    try {
      const defaultMethod = methods.find((m) => m.isDefault) ?? methods[0];
      const sub = await subscribe(selectedPlan, defaultMethod?.id);
      setSubscription(sub);
      setMsg("Welcome to B28 Premium — ad-free streaming!");
      setTimeout(() => router.push("/"), 1500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Subscription failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleFreeWithAds() {
    setBusy(true);
    try {
      const sub = await continueWithAds();
      setSubscription(sub);
      await refresh();
      router.push("/");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const currency = offers?.currency ?? "KES";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Choose your experience</h1>
      <p className="mb-8 text-muted">
        Hi {user.displayName ?? user.email.split("@")[0]} — pick a plan or continue with ads.
      </p>

      {subscription?.isPremium && (
        <div className="glass-panel mb-8 rounded-xl border border-green-500/30 p-4 text-green-300">
          You&apos;re on <strong>{subscription.plan}</strong> — ad-free until{" "}
          {subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : "renewal"}.
          <Link href="/" className="ml-2 underline">Go to homepage</Link>
        </div>
      )}

      {msg && <p className="mb-4 text-sm text-accent">{msg}</p>}

      <div className="mb-10 grid gap-4 md:grid-cols-3">
        {offers && (
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
              <p className="mt-2 text-sm text-muted">Ad-free streaming, full quality</p>
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
            <div className="glass-panel rounded-2xl p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Free</p>
              <p className="mt-2 text-3xl font-black">KES 0</p>
              <p className="mt-2 text-sm text-muted">Includes ads · 720p max</p>
              <button
                type="button"
                onClick={handleFreeWithAds}
                disabled={busy}
                className="btn btn-secondary mt-4 w-full text-sm"
              >
                Continue with ads
              </button>
            </div>
          </>
        )}
      </div>

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

      <button
        type="button"
        onClick={handleSubscribe}
        disabled={busy || selectedPlan === "FREE_WITH_ADS"}
        className="btn btn-primary w-full md:w-auto"
      >
        Subscribe & go ad-free
      </button>
    </div>
  );
}
