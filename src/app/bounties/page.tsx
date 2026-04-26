"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Bounty {
  id: string;
  type: string;
  title: string;
  description: string;
  context: Record<string, unknown>;
  rewardSats: number;
  status: string;
  claimedBy: string | null;
  claimedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  completedAt: string | null;
  paymentHash: string | null;
}

interface BountyStats {
  totalOpen: number;
  totalCompleted: number;
  totalSatsPaid: number;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  verify: { icon: "✅", label: "Verify", color: "var(--accent-emerald)" },
  rate: { icon: "⭐", label: "Rate", color: "var(--accent-amber)" },
  label: { icon: "🏷️", label: "Label", color: "var(--accent-cyan)" },
  write: { icon: "✍️", label: "Write", color: "var(--accent-violet)" },
  flag: { icon: "🚩", label: "Flag", color: "var(--accent-rose)" },
};

const STATUS_COLORS: Record<string, string> = {
  open: "var(--accent-emerald)",
  claimed: "var(--accent-amber)",
  submitted: "var(--accent-violet)",
  completed: "var(--accent-cyan)",
  expired: "var(--text-muted)",
};

export default function BountiesPage() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [stats, setStats] = useState<BountyStats>({ totalOpen: 0, totalCompleted: 0, totalSatsPaid: 0 });
  const [filter, setFilter] = useState<string>("all");
  const [activeBounty, setActiveBounty] = useState<string | null>(null);
  const [claimName, setClaimName] = useState("");
  const [submission, setSubmission] = useState("");
  const [lightningAddr, setLightningAddr] = useState("");
  const [bolt11, setBolt11] = useState("");
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, { type: "success" | "error"; msg: string }>>({});
  const [satsEarned, setSatsEarned] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [flagProvider, setFlagProvider] = useState(false);

  const fetchBounties = useCallback(async () => {
    try {
      const res = await fetch(`/api/bounties?status=${filter}`);
      const data = await res.json();
      setBounties(data.bounties || []);
      setStats(data.stats || { totalOpen: 0, totalCompleted: 0, totalSatsPaid: 0 });
    } catch (err) {
      console.error("Fetch bounties error:", err);
    }
  }, [filter]);

  useEffect(() => {
    fetchBounties();
    const interval = setInterval(fetchBounties, 5000);
    return () => clearInterval(interval);
  }, [fetchBounties]);

  const handleClaim = async (bountyId: string) => {
    setLoading((p) => ({ ...p, [bountyId]: true }));
    try {
      const res = await fetch("/api/bounties", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bountyId, action: "claim", claimedBy: claimName || "anonymous" }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback((p) => ({ ...p, [bountyId]: { type: "success", msg: data.message } }));
        setActiveBounty(bountyId);
      } else {
        setFeedback((p) => ({ ...p, [bountyId]: { type: "error", msg: data.error } }));
      }
    } finally {
      setLoading((p) => ({ ...p, [bountyId]: false }));
      fetchBounties();
    }
  };

  const handleSubmit = async (bountyId: string, rewardSats: number) => {
    if (!submission.trim()) return;
    setLoading((p) => ({ ...p, [bountyId]: true }));
    try {
      const res = await fetch("/api/bounties", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bountyId,
          action: "submit",
          submission: submission.trim(),
          lightningAddress: lightningAddr.trim() || undefined,
          bolt11Invoice: bolt11.trim() || undefined,
          flagProvider: flagProvider || undefined,
        }),
      });
      const data = await res.json();
      if (data.paymentProof) {
        setSatsEarned((p) => p + rewardSats);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        setFeedback((p) => ({
          ...p,
          [bountyId]: {
            type: "success",
            msg: `⚡ ${rewardSats} sats sent! Hash: ${data.paymentProof.paymentHash.substring(0, 20)}...`,
          },
        }));
      } else {
        setFeedback((p) => ({
          ...p,
          [bountyId]: { type: data.paymentError ? "error" : "success", msg: data.message },
        }));
      }
      setSubmission("");
      setActiveBounty(null);
      setFlagProvider(false);
    } finally {
      setLoading((p) => ({ ...p, [bountyId]: false }));
      fetchBounties();
    }
  };

  const timeLeft = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return "Expired";
    const min = Math.floor(ms / 60_000);
    if (min < 1) return "<1 min";
    return `${min} min`;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Confetti-like sats animation */}
      {showConfetti && (
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 200 }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${Math.random() * 100}%`,
                top: "-20px",
                fontSize: `${14 + Math.random() * 12}px`,
                animation: `satsFall ${1.5 + Math.random() * 1.5}s ease-in forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            >
              ⚡
            </div>
          ))}
          <style>{`
            @keyframes satsFall {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
          `}</style>
        </div>
      )}

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
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "9px",
                background: "linear-gradient(135deg, var(--accent-emerald), var(--accent-amber))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              💰
            </div>
            <div>
              <h1 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em" }}>
                Bounty Board
              </h1>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
                Earn real sats for tasks only humans can do
              </p>
            </div>
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {satsEarned > 0 && (
            <div
              className="font-mono animate-number-pop"
              style={{
                padding: "6px 16px",
                borderRadius: "999px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "var(--accent-amber)",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              ⚡ {satsEarned} sats earned
            </div>
          )}

          <Link
            href="/dashboard"
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            Dashboard →
          </Link>
        </div>
      </header>

      {/* Hero Stats */}
      <div
        style={{
          padding: "32px 32px 0",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "16px",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <div
          className="glass"
          style={{ padding: "20px", borderRadius: "14px", textAlign: "center" }}
        >
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px" }}>
            OPEN BOUNTIES
          </div>
          <div className="font-mono" style={{ fontSize: "28px", fontWeight: 700, color: "var(--accent-emerald)" }}>
            {stats.totalOpen}
          </div>
        </div>
        <div
          className="glass"
          style={{ padding: "20px", borderRadius: "14px", textAlign: "center" }}
        >
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px" }}>
            COMPLETED
          </div>
          <div className="font-mono" style={{ fontSize: "28px", fontWeight: 700, color: "var(--accent-violet)" }}>
            {stats.totalCompleted}
          </div>
        </div>
        <div
          className="glass"
          style={{ padding: "20px", borderRadius: "14px", textAlign: "center" }}
        >
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px" }}>
            TOTAL SATS PAID
          </div>
          <div className="font-mono" style={{ fontSize: "28px", fontWeight: 700, color: "var(--accent-amber)" }}>
            ⚡ {stats.totalSatsPaid}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          padding: "24px 32px",
          display: "flex",
          gap: "8px",
          justifyContent: "center",
        }}
      >
        {["all", "open", "claimed", "completed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 16px",
              borderRadius: "8px",
              border: filter === f ? "1px solid var(--accent-violet)" : "1px solid var(--border)",
              background: filter === f ? "rgba(91,33,182,0.12)" : "transparent",
              color: filter === f ? "var(--accent-violet)" : "var(--text-secondary)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Bounty List */}
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "0 32px 64px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {bounties.length === 0 ? (
          <div
            className="glass"
            style={{
              padding: "48px",
              borderRadius: "16px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
            <p style={{ fontSize: "14px", marginBottom: "8px" }}>No bounties yet</p>
            <p style={{ fontSize: "12px" }}>
              Go to the{" "}
              <Link href="/dashboard" style={{ color: "var(--accent-violet)", textDecoration: "underline" }}>
                Dashboard
              </Link>{" "}
              and trigger an incident — AI agents will post bounties for human review.
            </p>
          </div>
        ) : (
          bounties.map((b) => {
            const config = TYPE_CONFIG[b.type] || { icon: "📋", label: b.type, color: "var(--accent-violet)" };
            const isActive = activeBounty === b.id;
            const fb = feedback[b.id];
            const busy = loading[b.id];
            const remaining = timeLeft(b.expiresAt);
            const isExpired = remaining === "Expired" && b.status === "open";

            return (
              <div
                key={b.id}
                className="glass animate-fade-in-up"
                style={{
                  borderRadius: "14px",
                  overflow: "hidden",
                  border: isActive
                    ? `1px solid ${config.color}50`
                    : b.status === "completed"
                    ? "1px solid rgba(6, 182, 212, 0.2)"
                    : "1px solid var(--border)",
                  transition: "all 0.2s",
                }}
              >
                {/* Bounty header */}
                <div
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                  }}
                >
                  {/* Type icon */}
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "10px",
                      background: `${config.color}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      flexShrink: 0,
                    }}
                  >
                    {config.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                      <div>
                        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>{b.title}</h3>
                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                          {b.description}
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          className="font-mono"
                          style={{
                            fontSize: "18px",
                            fontWeight: 700,
                            color: "var(--accent-amber)",
                          }}
                        >
                          {b.rewardSats} sats
                        </div>
                        <div
                          style={{
                            fontSize: "9px",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontWeight: 600,
                            color: STATUS_COLORS[b.status] || "var(--text-muted)",
                            background: `${STATUS_COLORS[b.status] || "var(--text-muted)"}18`,
                            marginTop: "4px",
                            textTransform: "uppercase",
                            display: "inline-block",
                          }}
                        >
                          {b.status}
                        </div>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        marginTop: "8px",
                        fontSize: "10px",
                        color: "var(--text-muted)",
                      }}
                    >
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: `${config.color}15`,
                          color: config.color,
                          fontWeight: 600,
                        }}
                      >
                        {config.label}
                      </span>
                      {remaining && !isExpired && (
                        <span>⏱️ {remaining} left</span>
                      )}
                      {isExpired && <span style={{ color: "var(--accent-rose)" }}>⏱️ Expired</span>}
                      {b.claimedBy && (
                        <span>👤 {b.claimedBy}</span>
                      )}
                      {b.paymentHash && (
                        <span
                          className="font-mono"
                          style={{ color: "var(--accent-emerald)" }}
                          title={b.paymentHash}
                        >
                          🔐 {b.paymentHash.substring(0, 12)}...
                        </span>
                      )}
                    </div>

                    {/* Context preview */}
                    {b.context && Object.keys(b.context).length > 0 && b.status !== "completed" && (
                      <details style={{ marginTop: "8px" }}>
                        <summary
                          style={{
                            fontSize: "10px",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                        >
                          View context
                        </summary>
                        <pre
                          className="font-mono"
                          style={{
                            fontSize: "10px",
                            color: "var(--text-secondary)",
                            background: "rgba(62,39,35,0.05)",
                            padding: "8px",
                            borderRadius: "6px",
                            marginTop: "4px",
                            maxHeight: "120px",
                            overflow: "auto",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {JSON.stringify(b.context, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>

                {/* Action area */}
                {b.status === "open" && !isExpired && !isActive && (
                  <div
                    style={{
                      padding: "0 20px 16px",
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      placeholder="Your name (optional)"
                      value={claimName}
                      onChange={(e) => setClaimName(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "rgba(255,255,255,0.8)",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                      }}
                    />
                    <button
                      onClick={() => handleClaim(b.id)}
                      disabled={busy}
                      style={{
                        padding: "7px 20px",
                        borderRadius: "8px",
                        border: "none",
                        background: busy
                          ? "rgba(62,39,35,0.08)"
                          : "var(--accent-emerald)",
                        color: busy ? "var(--text-muted)" : "#FFFFFF",
                        fontWeight: 600,
                        fontSize: "12px",
                        cursor: busy ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        boxShadow: busy ? "none" : "0 2px 12px rgba(22,101,52,0.25)",
                      }}
                    >
                      {busy ? "⏳" : `🙋 Claim for ${b.rewardSats} sats`}
                    </button>
                  </div>
                )}

                {/* Submission form (when claimed by current user) */}
                {(b.status === "claimed" || isActive) && b.status !== "completed" && b.status !== "open" && (
                  <div
                    style={{
                      padding: "0 20px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      borderTop: "1px solid var(--border)",
                      paddingTop: "12px",
                    }}
                  >
                    <textarea
                      placeholder={
                        b.type === "rate"
                          ? "Your rating (1-5) and comments..."
                          : b.type === "verify"
                          ? "Is this correct? Explain your reasoning..."
                          : "Your submission..."
                      }
                      value={submission}
                      onChange={(e) => setSubmission(e.target.value)}
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "rgba(255,255,255,0.8)",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        resize: "vertical",
                      }}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        placeholder="Lightning address (user@wallet.com)"
                        value={lightningAddr}
                        onChange={(e) => setLightningAddr(e.target.value)}
                        style={{
                          flex: 1,
                          padding: "7px 10px",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          background: "rgba(255,255,255,0.8)",
                          color: "var(--text-primary)",
                          fontSize: "11px",
                          fontFamily: "monospace",
                        }}
                      />
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", alignSelf: "center" }}>or</span>
                      <input
                        placeholder="bolt11 invoice (lnbc...)"
                        value={bolt11}
                        onChange={(e) => setBolt11(e.target.value)}
                        style={{
                          flex: 1,
                          padding: "7px 10px",
                          borderRadius: "6px",
                          border: bolt11.trim().toLowerCase().startsWith("lnbc")
                            ? "1px solid rgba(16, 185, 129, 0.4)"
                            : "1px solid var(--border)",
                          background: "rgba(255,255,255,0.8)",
                          color: "var(--text-primary)",
                          fontSize: "11px",
                          fontFamily: "monospace",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div
                        style={{
                          fontSize: "10px",
                          color:
                            lightningAddr.includes("@") || bolt11.toLowerCase().startsWith("lnbc")
                              ? "var(--accent-emerald)"
                              : "var(--text-muted)",
                        }}
                      >
                        {lightningAddr.includes("@") || bolt11.toLowerCase().startsWith("lnbc")
                          ? `✓ Payment method detected — you'll receive ${b.rewardSats} real sats via Lightning`
                          : "Provide a Lightning address or bolt11 invoice to receive your reward instantly"}
                      </div>
                      <button
                        onClick={() => setFlagProvider((p) => !p)}
                        style={{
                          padding: "3px 10px",
                          borderRadius: "4px",
                          border: flagProvider ? "1px solid var(--accent-rose)" : "1px solid var(--border)",
                          background: flagProvider ? "rgba(244,63,94,0.12)" : "transparent",
                          color: flagProvider ? "var(--accent-rose)" : "var(--text-muted)",
                          fontSize: "10px",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        title="Flag this provider for bad work quality — reduces their reputation"
                      >
                        🚩 {flagProvider ? "Flagged" : "Flag Bad Work"}
                      </button>
                    </div>
                    <button
                      onClick={() => handleSubmit(b.id, b.rewardSats)}
                      disabled={busy || !submission.trim()}
                      style={{
                        padding: "9px 20px",
                        borderRadius: "8px",
                        border: "none",
                        background:
                          busy || !submission.trim()
                            ? "var(--bg-card)"
                            : "linear-gradient(135deg, var(--accent-amber), #fbbf24)",
                        color: busy || !submission.trim() ? "var(--text-muted)" : "#000",
                        fontWeight: 700,
                        fontSize: "13px",
                        cursor: busy || !submission.trim() ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        boxShadow:
                          busy || !submission.trim()
                            ? "none"
                            : "0 0 20px rgba(245, 158, 11, 0.3)",
                      }}
                    >
                      {busy ? "⏳ Submitting & paying..." : `⚡ Submit & Earn ${b.rewardSats} sats`}
                    </button>
                  </div>
                )}

                {/* Completed payment proof */}
                {b.status === "completed" && b.paymentHash && (
                  <div
                    style={{
                      padding: "0 20px 16px",
                      borderTop: "1px solid rgba(6, 182, 212, 0.15)",
                      paddingTop: "12px",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(6, 182, 212, 0.08)",
                        border: "1px solid rgba(6, 182, 212, 0.15)",
                      }}
                    >
                      <p style={{ fontSize: "9px", fontWeight: 700, color: "var(--accent-cyan)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                        ⚡ Lightning Payment Proof
                      </p>
                      <p className="font-mono" style={{ fontSize: "9px", color: "var(--accent-emerald)", wordBreak: "break-all" }}>
                        {b.paymentHash}
                      </p>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {fb && (
                  <div
                    style={{
                      padding: "8px 20px 12px",
                      fontSize: "11px",
                      fontWeight: 500,
                      color: fb.type === "success" ? "var(--accent-emerald)" : "var(--accent-rose)",
                    }}
                  >
                    {fb.msg}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer CTA */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "14px 32px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 50,
          boxShadow: "0 -4px 20px rgba(62,39,35,0.06)",
        }}
      >
        <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--accent-amber)", fontWeight: 600 }}>⚡ Powered by Lightning</span>{" — "}Payments settle instantly. No minimums. No sign-up.
        </p>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {stats.totalSatsPaid} sats paid to humans
          </span>
          <Link
            href="/dashboard"
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              background: "var(--text-primary)",
              color: "#FFFFFF",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            Agent Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
