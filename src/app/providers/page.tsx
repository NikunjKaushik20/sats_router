"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import {
  CAPABILITY_ICON_MAP,
  TRUST_ICON_MAP,
  Bot,
  Zap,
  Lock,
  Star,
  FlagTriangleRight,
  AlertTriangle,
  Ban,
  Bomb,
  ShieldCheck,
  CircleCheck,
  Search,
  Microscope,
  FileText,
  User,
  MessageSquare,
  TrendingUp,
  Settings,
} from "@/lib/icons";
import type { LucideIcon } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  description: string;
  capability: string;
  priceSats: number;
  reputationScore: number;
  totalJobs: number;
  flagCount: number;
  isActive: boolean;
  payoutLightningAddress: string;
  totalEarnedSats: number;
  stakeSats: number;
  stakeStatus: string;
  bidMultiplier: number;
}

function getTrustBadge(p: Provider): { Icon: LucideIcon; label: string; color: string; bg: string } | null {
  if (!p.isActive) return { Icon: Ban, label: "Suspended", color: "var(--accent-rose)", bg: "rgba(244,63,94,0.12)" };
  if (p.stakeStatus === "slashed") return { Icon: Bomb, label: "Slashed", color: "var(--accent-rose)", bg: "rgba(244,63,94,0.12)" };
  if (p.reputationScore < 2.5 && p.flagCount > 0) return { Icon: AlertTriangle, label: "Under Review", color: "var(--accent-amber)", bg: "rgba(245,158,11,0.12)" };
  if (p.stakeStatus === "staked" && p.reputationScore >= 4.0 && p.totalJobs >= 5) return { Icon: ShieldCheck, label: "Trusted + Staked", color: "var(--accent-emerald)", bg: "rgba(16,185,129,0.12)" };
  if (p.stakeStatus === "staked") return { Icon: Lock, label: "Staked", color: "var(--accent-cyan)", bg: "rgba(6,182,212,0.12)" };
  if (p.totalJobs < 3) return { Icon: CircleCheck, label: "New", color: "var(--accent-cyan)", bg: "rgba(6,182,212,0.12)" };
  if (p.reputationScore >= 4.0 && p.totalJobs >= 5) return { Icon: ShieldCheck, label: "Trusted", color: "var(--accent-emerald)", bg: "rgba(16,185,129,0.12)" };
  return null;
}

const CAP_CONFIG: Record<string, { Icon: LucideIcon; color: string; label: string }> = {
  quick_scan: { Icon: Search, color: "var(--accent-cyan)", label: "Quick Scan" },
  deep_diagnose: { Icon: Microscope, color: "var(--accent-violet)", label: "Deep Diagnose" },
  incident_summary: { Icon: FileText, color: "var(--accent-amber)", label: "Summary" },
  human_verify: { Icon: User, color: "var(--accent-emerald)", label: "Human Verify" },
  code_review: { Icon: ShieldCheck, color: "var(--accent-rose)", label: "Code Review" },
  sentiment_analysis: { Icon: MessageSquare, color: "var(--accent-cyan)", label: "Sentiment" },
  anomaly_detection: { Icon: TrendingUp, color: "var(--accent-amber)", label: "Anomaly" },
};

function getCapConfig(cap: string) {
  return CAP_CONFIG[cap] || { Icon: Settings, color: "var(--accent-violet)", label: cap };
}

function renderStars(score: number) {
  const full = Math.floor(score);
  const empty = 5 - full;
  return (
    <span style={{ display: "inline-flex", gap: 1, color: "var(--accent-amber)" }}>
      {Array.from({ length: full }).map((_, i) => <Star key={`f${i}`} size={12} fill="currentColor" aria-hidden="true" />)}
      {Array.from({ length: empty }).map((_, i) => <Star key={`e${i}`} size={12} aria-hidden="true" />)}
    </span>
  );
}

export default function ProviderDirectoryPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [sortBy, setSortBy] = useState<"reputation" | "price" | "jobs">("reputation");
  const [filterCap, setFilterCap] = useState<string>("all");

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      setProviders(data || []);
    } catch (err) {
      console.error("Fetch providers error:", err);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
    const interval = setInterval(fetchProviders, 10000);
    return () => clearInterval(interval);
  }, [fetchProviders]);

  const capabilities = [...new Set(providers.map((p) => p.capability))];

  const sorted = [...providers]
    .filter((p) => filterCap === "all" || p.capability === filterCap)
    .sort((a, b) => {
      if (sortBy === "reputation") return b.reputationScore - a.reputationScore;
      if (sortBy === "price") return a.priceSats - b.priceSats;
      return b.totalJobs - a.totalJobs;
    });

  const totalAgents = providers.length;
  const activeAgents = providers.filter((p) => p.isActive).length;
  const totalEarned = providers.reduce((s, p) => s + p.totalEarnedSats, 0);
  const totalJobs = providers.reduce((s, p) => s + p.totalJobs, 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Page header section */}
      <div
        style={{
          padding: "var(--space-6) var(--space-8) var(--space-4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 style={{ fontSize: "var(--text-lg)", fontWeight: 700, letterSpacing: "-0.02em" }}>Agent Directory</h1>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
            {activeAgents} active agents • {totalJobs} total jobs
          </p>
        </div>
        <Link href="/providers/register" className="btn btn-success" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <User size={14} aria-hidden="true" /> Register Agent
        </Link>
      </div>

      {/* Stats */}
      <div
        style={{
          padding: "24px 32px 0",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {[
          { label: "REGISTERED AGENTS", value: totalAgents, color: "var(--accent-violet)" },
          { label: "ACTIVE NOW", value: activeAgents, color: "var(--accent-emerald)" },
          { label: "TOTAL JOBS", value: totalJobs, color: "var(--accent-cyan)" },
          { label: "TOTAL EARNED", value: `${totalEarned} sats`, color: "var(--accent-amber)" },
        ].map((s) => (
          <div
            key={s.label}
            className="glass"
            style={{ padding: "16px", borderRadius: "12px", textAlign: "center" }}
          >
            <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px" }}>
              {s.label}
            </div>
            <div className="font-mono" style={{ fontSize: "24px", fontWeight: 700, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Sort */}
      <div
        style={{
          padding: "20px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            onClick={() => setFilterCap("all")}
            style={{
              padding: "5px 12px",
              borderRadius: "6px",
              border: filterCap === "all" ? "1px solid var(--accent-violet)" : "1px solid var(--border)",
              background: filterCap === "all" ? "rgba(139,92,246,0.12)" : "transparent",
              color: filterCap === "all" ? "var(--accent-violet)" : "var(--text-muted)",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            All
          </button>
          {capabilities.map((cap) => {
            const cfg = getCapConfig(cap);
            return (
              <button
                key={cap}
                onClick={() => setFilterCap(cap)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: filterCap === cap ? `1px solid ${cfg.color}` : "1px solid var(--border)",
                  background: filterCap === cap ? `${cfg.color}18` : "transparent",
                  color: filterCap === cap ? cfg.color : "var(--text-muted)",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <cfg.Icon size={12} aria-hidden="true" style={{ marginRight: 3 }} /> {cfg.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", marginRight: "4px" }}>Sort:</span>
          {(["reputation", "price", "jobs"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                border: sortBy === s ? "1px solid var(--accent-violet)" : "1px solid var(--border)",
                background: sortBy === s ? "rgba(139,92,246,0.1)" : "transparent",
                color: sortBy === s ? "var(--accent-violet)" : "var(--text-muted)",
                fontSize: "10px",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Provider Cards */}
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "0 32px 64px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
        }}
      >
        {sorted.length === 0 ? (
          <div
            className="glass"
            style={{ gridColumn: "1/3", padding: "48px", borderRadius: "16px", textAlign: "center", color: "var(--text-muted)" }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}><Bot size={48} aria-hidden="true" style={{ color: "var(--text-muted)" }} /></div>
            <p style={{ fontSize: "14px", marginBottom: "8px" }}>No agents registered yet</p>
            <Link href="/providers/register" style={{ color: "var(--accent-violet)", textDecoration: "underline", fontSize: "12px" }}>
              Be the first to register →
            </Link>
          </div>
        ) : (
          sorted.map((p) => {
            const cfg = getCapConfig(p.capability);
            return (
              <div
                key={p.id}
                className="glass glass-hover animate-fade-in-up"
                style={{
                  borderRadius: "14px",
                  padding: "18px",
                  transition: "all 0.2s",
                  border: p.isActive ? "1px solid var(--border)" : "1px solid rgba(244,63,94,0.2)",
                  opacity: p.isActive ? 1 : 0.6,
                }}
              >
                {/* Top row: icon + name + status */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: `${cfg.color}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      flexShrink: 0,
                    }}
                  >
                    <cfg.Icon size={20} aria-hidden="true" style={{ color: cfg.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ fontSize: "14px", fontWeight: 700 }}>{p.name}</h3>
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: p.isActive ? "var(--accent-emerald)" : "var(--accent-rose)",
                          boxShadow: p.isActive ? "0 0 6px rgba(16,185,129,0.5)" : "none",
                        }}
                        title={p.isActive ? "Active" : "Inactive"}
                      />
                    </div>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.4, marginTop: "2px" }}>
                      {p.description}
                    </p>
                  </div>
                </div>

                {/* Capability tag + Trust badge */}
                <div style={{ marginBottom: "10px", display: "flex", gap: "6px", alignItems: "center" }}>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "4px",
                      background: `${cfg.color}15`,
                      color: cfg.color,
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {cfg.label}
                  </span>
                  {(() => {
                    const badge = getTrustBadge(p);
                    if (!badge) return null;
                    return (
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          background: badge.bg,
                          color: badge.color,
                          fontSize: "9px",
                          fontWeight: 700,
                        }}
                      >
                        <badge.Icon size={10} aria-hidden="true" style={{ marginRight: 3 }} /> {badge.label}
                      </span>
                    );
                  })()}
                  {p.flagCount > 0 && (
                    <span style={{ fontSize: "9px", color: "var(--accent-rose)" }}>
                      <FlagTriangleRight size={10} aria-hidden="true" style={{ marginRight: 2 }} /> {p.flagCount}
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "8px",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "var(--bg-secondary)",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div className="font-mono" style={{ fontSize: "15px", fontWeight: 700, color: "var(--accent-amber)" }}>
                      {p.priceSats}
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>sats/req</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-violet)" }}>
                      {renderStars(p.reputationScore)}
                    </div>
                    <div className="font-mono" style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                      {p.reputationScore.toFixed(1)}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div className="font-mono" style={{ fontSize: "15px", fontWeight: 700, color: "var(--accent-cyan)" }}>
                      {p.totalJobs}
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>jobs</div>
                  </div>
                </div>

                {/* Staking indicator */}
                {p.stakeSats > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", marginBottom: "4px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Stake:</span>
                    <span className="font-mono" style={{ fontWeight: 700, color: p.stakeStatus === "slashed" ? "var(--accent-rose)" : "var(--accent-cyan)" }}>
                      {p.stakeStatus === "slashed" ? <><Zap size={10} aria-hidden="true" style={{ marginRight: 2 }} /> {p.stakeSats} sats SLASHED</> : <><Lock size={10} aria-hidden="true" style={{ marginRight: 2 }} /> {p.stakeSats} sats locked</>}
                    </span>
                  </div>
                )}

                {/* Bid multiplier / effective price */}
                {p.bidMultiplier < 1.0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", marginBottom: "4px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Bid discount:</span>
                    <span className="font-mono" style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>
                      {Math.round((1 - p.bidMultiplier) * 100)}% off → {Math.round(p.priceSats * p.bidMultiplier)} sats effective
                    </span>
                  </div>
                )}

                {/* Earnings */}
                {p.totalEarnedSats > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Lifetime earnings:</span>
                    <span className="font-mono" style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>
                      <Zap size={10} aria-hidden="true" style={{ marginRight: 2 }} /> {p.totalEarnedSats} sats
                    </span>
                  </div>
                )}

                {/* Lightning address indicator */}
                {p.payoutLightningAddress && (
                  <div style={{ marginTop: "6px", fontSize: "9px", color: "var(--text-muted)" }}>
                    <Zap size={10} aria-hidden="true" style={{ marginRight: 2 }} /> Payouts to: <span className="font-mono" style={{ color: "var(--accent-emerald)" }}>{p.payoutLightningAddress}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CTA Bar */}
      <div
        style={{
          padding: "var(--space-4) var(--space-8)",
          background: "var(--bg-secondary)",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "var(--space-8)",
        }}
      >
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
          Anyone can register an agent and earn sats — <span style={{ color: "var(--accent-amber)" }}>no API keys, no sign-up, just Lightning</span>
        </p>
        <Link
          href="/providers/register"
          className="btn btn-success"
        >
          + Register Your Agent
        </Link>
      </div>
    </div>
  );
}
