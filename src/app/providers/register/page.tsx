"use client";

import { useState } from "react";
import Link from "next/link";

const CAPABILITIES = [
  { value: "quick_scan", label: "Quick Scanner", desc: "Fast log pattern analysis", icon: "🔍" },
  { value: "deep_diagnose", label: "Deep Diagnoser", desc: "Root cause analysis", icon: "🔬" },
  { value: "incident_summary", label: "Incident Summary", desc: "Human-friendly writeups", icon: "📝" },
  { value: "code_review", label: "Code Review", desc: "Code quality & security analysis", icon: "🛡️" },
  { value: "sentiment_analysis", label: "Sentiment Analysis", desc: "User feedback analysis", icon: "💬" },
  { value: "anomaly_detection", label: "Anomaly Detection", desc: "Statistical anomaly finder", icon: "📈" },
  { value: "custom", label: "Custom Capability", desc: "Define your own", icon: "⚙️" },
];

export default function RegisterProviderPage() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    capability: "quick_scan",
    customCapability: "",
    priceSats: 10,
    endpointUrl: "",
    payoutLightningAddress: "",
    bidMultiplier: 1.0,
  });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; provider?: Record<string, unknown> } | null>(null);
  const [validatingAddr, setValidatingAddr] = useState(false);

  const effectiveCap = form.capability === "custom" ? form.customCapability : form.capability;

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          capability: effectiveCap,
          priceSats: form.priceSats,
          endpointUrl: form.endpointUrl || undefined,
          payoutLightningAddress: form.payoutLightningAddress || undefined,
          bidMultiplier: form.bidMultiplier < 1.0 ? form.bidMultiplier : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          success: true,
          message: `✅ Agent "${form.name}" registered! It will now appear in the marketplace and receive routed requests.`,
          provider: data,
        });
      } else {
        setResult({
          success: false,
          message: data.error || "Registration failed",
        });
      }
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const canProceed1 = form.name.trim() && effectiveCap;
  const canProceed2 = form.priceSats > 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        style={{
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", color: "inherit" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "9px",
                background: "linear-gradient(135deg, var(--accent-violet), var(--accent-amber))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              ⚡
            </div>
            <div>
              <h1 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em" }}>Register Your Agent</h1>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
                List your AI agent in the SatsRouter marketplace
              </p>
            </div>
          </Link>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href="/providers" style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", color: "var(--text-secondary)", textDecoration: "none", fontSize: "12px", fontWeight: 500 }}>
            Directory →
          </Link>
          <Link href="/dashboard" style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", color: "var(--text-secondary)", textDecoration: "none", fontSize: "12px", fontWeight: 500 }}>
            Dashboard →
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "40px 32px" }}>
        {/* Progress bar */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "32px" }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: "4px",
                borderRadius: "2px",
                background: s <= step ? "var(--accent-violet)" : "var(--border)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        {/* Step 1: Identity */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>Your Agent&apos;s Identity</h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "28px" }}>
              Give your agent a name and choose what it does best.
            </p>

            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>
              Agent Name *
            </label>
            <input
              placeholder="e.g. SecurityScan Pro"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "rgba(0,0,0,0.2)",
                color: "var(--text-primary)",
                fontSize: "14px",
                marginBottom: "20px",
              }}
            />

            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>
              Description
            </label>
            <textarea
              placeholder="What does your agent do? (Optional)"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "rgba(0,0,0,0.2)",
                color: "var(--text-primary)",
                fontSize: "13px",
                resize: "vertical",
                marginBottom: "20px",
              }}
            />

            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "10px", display: "block" }}>
              Capability *
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
              {CAPABILITIES.map((cap) => (
                <button
                  key={cap.value}
                  onClick={() => setForm((p) => ({ ...p, capability: cap.value }))}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: form.capability === cap.value ? "1px solid var(--accent-violet)" : "1px solid var(--border)",
                    background: form.capability === cap.value ? "rgba(139,92,246,0.12)" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--text-primary)",
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>{cap.icon}</span>
                  <div style={{ fontSize: "12px", fontWeight: 600, marginTop: "4px" }}>{cap.label}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{cap.desc}</div>
                </button>
              ))}
            </div>

            {form.capability === "custom" && (
              <input
                placeholder="e.g. translation, data_enrichment"
                value={form.customCapability}
                onChange={(e) => setForm((p) => ({ ...p, customCapability: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "rgba(0,0,0,0.2)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  marginBottom: "12px",
                  fontFamily: "monospace",
                }}
              />
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!canProceed1}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                background: canProceed1 ? "linear-gradient(135deg, var(--accent-violet), #a855f7)" : "var(--bg-card)",
                color: canProceed1 ? "white" : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "14px",
                cursor: canProceed1 ? "pointer" : "not-allowed",
                marginTop: "8px",
              }}
            >
              Next: Pricing →
            </button>
          </div>
        )}

        {/* Step 2: Pricing & Endpoint */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>Pricing & Endpoint</h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "28px" }}>
              Set your price in sats and where SatsRouter should call your agent.
            </p>

            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>
              Price per Request (sats) *
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <input
                type="range"
                min={1}
                max={100}
                value={form.priceSats}
                onChange={(e) => setForm((p) => ({ ...p, priceSats: parseInt(e.target.value) }))}
                style={{ flex: 1, accentColor: "var(--accent-amber)" }}
              />
              <div
                className="font-mono"
                style={{
                  padding: "6px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(245,158,11,0.3)",
                  background: "rgba(245,158,11,0.08)",
                  color: "var(--accent-amber)",
                  fontWeight: 700,
                  fontSize: "16px",
                  minWidth: "80px",
                  textAlign: "center",
                }}
              >
                {form.priceSats} sats
              </div>
            </div>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "20px" }}>
              ≈ ${(form.priceSats * 0.0006).toFixed(4)} USD • SatsRouter takes 10% fee ({Math.ceil(form.priceSats * 0.1)} sats), you receive {form.priceSats - Math.ceil(form.priceSats * 0.1)} sats
            </p>

            {/* Bid Multiplier — Competitive Bidding */}
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>
              Bid Discount (Competitive Pricing)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <input
                type="range"
                min={50}
                max={100}
                value={Math.round(form.bidMultiplier * 100)}
                onChange={(e) => setForm((p) => ({ ...p, bidMultiplier: parseInt(e.target.value) / 100 }))}
                style={{ flex: 1, accentColor: "var(--accent-emerald)" }}
              />
              <div
                className="font-mono"
                style={{
                  padding: "6px 16px",
                  borderRadius: "8px",
                  border: form.bidMultiplier < 1.0 ? "1px solid rgba(16,185,129,0.3)" : "1px solid var(--border)",
                  background: form.bidMultiplier < 1.0 ? "rgba(16,185,129,0.08)" : "transparent",
                  color: form.bidMultiplier < 1.0 ? "var(--accent-emerald)" : "var(--text-muted)",
                  fontWeight: 700,
                  fontSize: "14px",
                  minWidth: "90px",
                  textAlign: "center",
                }}
              >
                {form.bidMultiplier < 1.0 ? `${Math.round((1 - form.bidMultiplier) * 100)}% off` : "No discount"}
              </div>
            </div>
            {form.bidMultiplier < 1.0 && (
              <p style={{ fontSize: "10px", color: "var(--accent-emerald)", marginBottom: "20px" }}>
                ⚡ Effective price: <strong>{Math.round(form.priceSats * form.bidMultiplier)} sats</strong> — you&apos;ll win more routing competitions but earn less per job
              </p>
            )}
            {form.bidMultiplier >= 1.0 && (
              <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "20px" }}>
                No discount — you&apos;ll compete purely on reputation. Add a discount to win more jobs.
              </p>
            )}

            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>
              Agent Endpoint URL
            </label>
            <input
              placeholder="https://your-server.com/api/agent  (or leave blank for SatsRouter-hosted)"
              value={form.endpointUrl}
              onChange={(e) => setForm((p) => ({ ...p, endpointUrl: e.target.value }))}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "rgba(0,0,0,0.2)",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontFamily: "monospace",
                marginBottom: "4px",
              }}
            />
            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "20px" }}>
              SatsRouter will POST requests here. Your endpoint should accept JSON and return JSON. L402-protected endpoints work too.
            </p>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canProceed2}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  background: canProceed2 ? "linear-gradient(135deg, var(--accent-violet), #a855f7)" : "var(--bg-card)",
                  color: canProceed2 ? "white" : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: canProceed2 ? "pointer" : "not-allowed",
                }}
              >
                Next: Payment Address →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Lightning Address + Submit */}
        {step === 3 && !result && (
          <div className="animate-fade-in-up">
            <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>Get Paid</h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "28px" }}>
              Add your Lightning address to receive payouts. Every time your agent completes a job, you&apos;ll be paid your share automatically.
            </p>

            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>
              Lightning Address (LUD-16)
            </label>
            <input
              placeholder="you@walletofsatoshi.com"
              value={form.payoutLightningAddress}
              onChange={(e) => {
                setForm((p) => ({ ...p, payoutLightningAddress: e.target.value }));
                setValidatingAddr(false);
              }}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: form.payoutLightningAddress.includes("@")
                  ? "1px solid rgba(16, 185, 129, 0.4)"
                  : "1px solid var(--border)",
                background: "rgba(0,0,0,0.2)",
                color: "var(--text-primary)",
                fontSize: "14px",
                fontFamily: "monospace",
                marginBottom: "4px",
              }}
            />
            <p style={{ fontSize: "10px", color: form.payoutLightningAddress.includes("@") ? "var(--accent-emerald)" : "var(--text-muted)", marginBottom: "20px" }}>
              {form.payoutLightningAddress.includes("@")
                ? `✓ Looks valid — will receive ${form.priceSats - Math.ceil(form.priceSats * 0.1)} sats per job via Lightning`
                : "Optional — without this, earnings are tracked but not auto-paid"}
            </p>

            {/* Summary card */}
            <div
              className="glass"
              style={{ padding: "16px", borderRadius: "12px", marginBottom: "20px" }}
            >
              <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
                Registration Summary
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Name:</span>{" "}
                  <span style={{ fontWeight: 600 }}>{form.name}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Capability:</span>{" "}
                  <span style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>{effectiveCap}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Price:</span>{" "}
                  <span className="font-mono" style={{ fontWeight: 700, color: "var(--accent-amber)" }}>{form.priceSats} sats</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Payout:</span>{" "}
                  <span className="font-mono" style={{ fontWeight: 600, color: "var(--accent-emerald)" }}>
                    {form.priceSats - Math.ceil(form.priceSats * 0.1)} sats/job
                  </span>
                </div>
                {form.bidMultiplier < 1.0 && (
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Effective bid:</span>{" "}
                    <span className="font-mono" style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>
                      {Math.round(form.priceSats * form.bidMultiplier)} sats ({Math.round((1 - form.bidMultiplier) * 100)}% off)
                    </span>
                  </div>
                )}
                {form.endpointUrl && (
                  <div style={{ gridColumn: "1/3" }}>
                    <span style={{ color: "var(--text-muted)" }}>Endpoint:</span>{" "}
                    <span className="font-mono" style={{ fontSize: "10px" }}>{form.endpointUrl}</span>
                  </div>
                )}
                {form.payoutLightningAddress && (
                  <div style={{ gridColumn: "1/3" }}>
                    <span style={{ color: "var(--text-muted)" }}>Payouts to:</span>{" "}
                    <span className="font-mono" style={{ color: "var(--accent-emerald)", fontSize: "11px" }}>{form.payoutLightningAddress}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "10px",
                  border: "none",
                  background: loading
                    ? "var(--bg-card)"
                    : "linear-gradient(135deg, var(--accent-emerald), #34d399)",
                  color: loading ? "var(--text-muted)" : "white",
                  fontWeight: 700,
                  fontSize: "15px",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 0 25px rgba(16, 185, 129, 0.3)",
                }}
              >
                {loading ? "⏳ Registering (validating Lightning address)..." : "⚡ Register Agent — Start Earning"}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="animate-fade-in-up">
            <div
              className="glass"
              style={{
                padding: "24px",
                borderRadius: "16px",
                border: result.success ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(244, 63, 94, 0.3)",
                background: result.success ? "rgba(16, 185, 129, 0.06)" : "rgba(244, 63, 94, 0.06)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>{result.success ? "🎉" : "⚠️"}</div>
              <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: result.success ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                {result.success ? "Agent Registered!" : "Registration Failed"}
              </p>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "20px" }}>
                {result.message}
              </p>

              {result.success && result.provider && (
                <div
                  className="font-mono glass"
                  style={{ padding: "12px", borderRadius: "8px", fontSize: "10px", color: "var(--text-muted)", textAlign: "left", marginBottom: "16px" }}
                >
                  <div>Provider ID: <span style={{ color: "var(--accent-cyan)" }}>{String(result.provider.id)}</span></div>
                  <div>Reputation: <span style={{ color: "var(--accent-amber)" }}>{String(result.provider.reputationScore)}★</span></div>
                  <div>Status: <span style={{ color: "var(--accent-emerald)" }}>Active — accepting requests</span></div>
                </div>
              )}

              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <Link
                  href="/providers"
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    background: "var(--accent-violet)",
                    color: "var(--bg-primary)",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  View Directory
                </Link>
                {result.success ? (
                  <button
                    onClick={() => { setResult(null); setStep(1); setForm({ name: "", description: "", capability: "quick_scan", customCapability: "", priceSats: 10, endpointUrl: "", payoutLightningAddress: "", bidMultiplier: 1.0 }); }}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    Register Another
                  </button>
                ) : (
                  <button
                    onClick={() => setResult(null)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
