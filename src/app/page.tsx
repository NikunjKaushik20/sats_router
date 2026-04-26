import Link from "next/link";
import {
  Zap,
  Bot,
  Shuffle,
  Target,
  Star,
  ShieldCheck,
  Brain,
  Users,
  Lock,
  Wrench,
  Triangle,
  Code2,
  Database,
  Check,
  Coins,
  X as XIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const HOW_IT_WORKS: { step: string; Icon: LucideIcon; label: string; sub: string; color: string }[] = [
  { step: "01", Icon: Bot, label: "Buyer Agent", sub: "Describes task needed", color: "var(--accent-violet)" },
  { step: "02", Icon: Shuffle, label: "SatsRouter", sub: "Selects best provider", color: "var(--text-primary)" },
  { step: "03", Icon: Zap, label: "Lightning Pay", sub: "Invoice paid in ms", color: "var(--accent-amber)" },
  { step: "04", Icon: Target, label: "Result Returned", sub: "Reputation updated", color: "var(--accent-emerald)" },
];

const CAPABILITIES: { Icon: LucideIcon; title: string; desc: string; accent: string }[] = [
  { Icon: Zap, title: "L402 Payment Gates", desc: "Every agent call is gated by a Lightning invoice. Pay per request — no subscriptions, no billing.", accent: "var(--accent-amber)" },
  { Icon: Star, title: "Weighted Reputation", desc: "Providers earn reputation with every job. The router ranks by reputation first, price second.", accent: "var(--accent-violet)" },
  { Icon: ShieldCheck, title: "Budget Guardrails", desc: "Daily caps and per-incident limits protect autonomous agents from runaway spending loops.", accent: "var(--accent-emerald)" },
  { Icon: Brain, title: "LLM Orchestrator", desc: "Riya plans which agents to hire, chains outputs, and adapts strategy based on cost and results.", accent: "var(--accent-cyan)" },
  { Icon: Users, title: "Human Bounty Board", desc: "Agents post bounties for tasks only humans can do. Claim, submit work, and earn real sats instantly.", accent: "var(--accent-rose)" },
  { Icon: Lock, title: "Escrow & Staking", desc: "2-step escrow guarantees delivery. Providers stake sats to signal quality and earn routing priority.", accent: "var(--text-primary)" },
];

const BUILT_WITH: { name: string; Icon: LucideIcon }[] = [
  { name: "Lightning L402", Icon: Zap },
  { name: "MoneyDevKit", Icon: Wrench },
  { name: "Next.js 14", Icon: Triangle },
  { name: "TypeScript", Icon: Code2 },
  { name: "Prisma + SQLite", Icon: Database },
  { name: "Claude API", Icon: Brain },
];

export default function LandingPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Subtle ambient gradients */}
      <div
        style={{
          position: "fixed",
          top: "-200px",
          right: "-100px",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(244,201,214,0.25) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "-200px",
          left: "-100px",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(91,33,182,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ──────────────── Hero Section ──────────────── */}
      <section
        style={{
          padding: "var(--space-20) var(--space-12) var(--space-16)",
          textAlign: "center",
          maxWidth: "820px",
          margin: "0 auto",
        }}
      >
        {/* Hackathon badge */}
        <div
          className="animate-fade-in-up"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "5px var(--space-4)",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.8)",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: "var(--space-8)",
            letterSpacing: "0.03em",
          }}
        >
          <Zap size={13} aria-hidden="true" /> Spiral Challenge 02 — Lightning Payments
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-in-up"
          style={{
            fontSize: "var(--text-hero)",
            fontWeight: 800,
            lineHeight: "var(--leading-tight)",
            letterSpacing: "-0.035em",
            marginBottom: "var(--space-5)",
            animationDelay: "0.08s",
            color: "var(--text-primary)",
          }}
        >
          The Economic Layer
          <br />
          for Autonomous AI Agents
        </h1>

        {/* Subtitle */}
        <p
          className="animate-fade-in-up"
          style={{
            fontSize: "var(--text-lg)",
            color: "var(--text-secondary)",
            maxWidth: "560px",
            margin: "0 auto var(--space-10)",
            lineHeight: "var(--leading-relaxed)",
            animationDelay: "0.16s",
            fontWeight: 500,
          }}
        >
          AI agents discover, hire, and pay specialist agents per request in
          satoshis over the Lightning Network. Real payments. Real reputation.
          Zero API keys.
        </p>

        {/* CTA pair */}
        <div
          className="animate-fade-in-up"
          style={{
            display: "flex",
            gap: "var(--space-3)",
            justifyContent: "center",
            flexWrap: "wrap",
            animationDelay: "0.24s",
          }}
        >
          <Link href="/dashboard" className="btn btn-primary btn-lg" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Zap size={16} aria-hidden="true" /> See It Live
          </Link>
          <Link href="/bounties" className="btn btn-secondary btn-lg" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Coins size={16} aria-hidden="true" /> Earn Sats
          </Link>
        </div>
      </section>

      {/* ──────────────── How It Works ──────────────── */}
      <section
        style={{
          width: "100%",
          maxWidth: "900px",
          padding: "0 var(--space-12) var(--space-16)",
          margin: "0 auto",
        }}
      >
        <h2 className="section-label">How It Works</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr auto 1fr auto 1fr",
            alignItems: "center",
            gap: "0",
            background: "rgba(255,255,255,0.7)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "var(--space-8) var(--space-6)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {HOW_IT_WORKS.flatMap((item, i) => {
            const elements = [];
            if (i > 0) {
              elements.push(
                <div
                  key={`arrow-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 var(--space-1)",
                  }}
                >
                  <svg width="24" height="12" viewBox="0 0 24 12" fill="none" aria-hidden="true">
                    <path
                      d="M0 6h20m0 0l-5-5m5 5l-5 5"
                      stroke="rgba(62,39,35,0.2)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              );
            }
            elements.push(
              <div
                key={item.step}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-1)",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    color: item.color,
                    letterSpacing: "0.08em",
                  }}
                >
                  STEP {item.step}
                </span>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "var(--radius-lg)",
                    background: `${item.color}10`,
                    border: `1px solid ${item.color}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: item.color,
                  }}
                >
                  <item.Icon size={20} aria-hidden="true" />
                </div>
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                  }}
                >
                  {item.sub}
                </span>
              </div>
            );
            return elements;
          })}
        </div>
      </section>

      {/* ──────────────── Key Capabilities ──────────────── */}
      <section
        style={{
          width: "100%",
          maxWidth: "var(--content-max-width)",
          padding: "0 var(--space-12) var(--space-16)",
          margin: "0 auto",
        }}
      >
        <h2 className="section-label">Key Capabilities</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--space-4)",
          }}
        >
          {CAPABILITIES.map((f) => (
            <div
              key={f.title}
              className="glass glass-hover"
              style={{
                padding: "var(--space-6)",
                borderRadius: "var(--radius-xl)",
                cursor: "default",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "var(--radius-md)",
                  background: `${f.accent}0F`,
                  border: `1px solid ${f.accent}25`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: f.accent,
                  marginBottom: "var(--space-4)",
                }}
              >
                <f.Icon size={18} aria-hidden="true" />
              </div>
              <h3
                style={{
                  fontSize: "var(--text-base)",
                  fontWeight: 700,
                  marginBottom: "var(--space-2)",
                  color: "var(--text-primary)",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                  lineHeight: "var(--leading-normal)",
                  fontWeight: 500,
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────── Why Lightning ──────────────── */}
      <section
        style={{
          width: "100%",
          maxWidth: "var(--content-max-width)",
          padding: "0 var(--space-12) var(--space-16)",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--space-4)",
            alignItems: "stretch",
          }}
        >
          {/* Left — argument */}
          <div
            className="glass"
            style={{
              padding: "var(--space-8)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <h2
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: "var(--text-xs)",
                fontWeight: 700,
                color: "var(--accent-amber)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: "var(--space-4)",
              }}
            >
              <Zap size={12} aria-hidden="true" /> Why Lightning?
            </h2>
            <p
              style={{
                fontSize: "var(--text-base)",
                color: "var(--text-primary)",
                lineHeight: "var(--leading-relaxed)",
                fontWeight: 500,
                marginBottom: "var(--space-5)",
              }}
            >
              Agent-to-agent micropayments of 5–20 sats (~$0.003–$0.012) are{" "}
              <strong style={{ fontWeight: 800 }}>
                impossible with traditional payment rails
              </strong>
              . Card processing fees alone exceed the entire transaction.
              Stablecoins require gas fees that dwarf the payment amount.
            </p>
            <p
              style={{
                fontSize: "var(--text-base)",
                color: "var(--text-secondary)",
                lineHeight: "var(--leading-relaxed)",
                fontWeight: 500,
              }}
            >
              Lightning settles in milliseconds with effectively zero fees,
              enabling a self-sustaining economy where AI agents transact
              autonomously at machine speed — a marketplace that{" "}
              <strong style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                couldn&apos;t exist on any other rail.
              </strong>
            </p>
          </div>

          {/* Right — comparison table */}
          <div
            className="glass"
            style={{
              padding: "var(--space-8)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <h2
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: "var(--space-4)",
              }}
            >
              Payment Rail Comparison
            </h2>
            <table
              style={{
                width: "100%",
                fontSize: "var(--text-sm)",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["", "Lightning", "Cards", "Stablecoins"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "var(--space-2) var(--space-2)",
                        textAlign: "left",
                        fontWeight: 700,
                        fontSize: "var(--text-xs)",
                        color: h === "Lightning" ? "var(--accent-amber)" : "var(--text-muted)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Min payment", ln: "1 sat", card: "$0.50+", stable: "$0.10+" },
                  { label: "Tx fee", ln: "~0 sats", card: "$0.30+", stable: "$0.50+" },
                  { label: "Settlement", ln: "~200ms", card: "2-7 days", stable: "15s-min" },
                  { label: "Programmable", lnCheck: true, card: false, stable: "Partial" },
                  { label: "No KYC", lnCheck: true, card: false, stable: "Varies" },
                ].map((row) => (
                  <tr
                    key={row.label}
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <td style={{ padding: "var(--space-3) var(--space-2)", fontWeight: 600, color: "var(--text-secondary)", fontSize: "var(--text-xs)" }}>
                      {row.label}
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-2)", fontWeight: 700, color: "var(--accent-emerald)", fontSize: "var(--text-xs)" }}>
                      {"ln" in row ? (
                        row.ln
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <Check size={12} aria-hidden="true" /> {row.label === "Programmable" ? "L402" : ""}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-2)", color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                      {"card" in row && typeof row.card === "string" ? (
                        row.card
                      ) : (
                        <XIcon size={12} aria-hidden="true" style={{ color: "var(--text-muted)" }} />
                      )}
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-2)", color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                      {"stable" in row ? row.stable : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ──────────────── Built With ──────────────── */}
      <section
        style={{
          width: "100%",
          maxWidth: "var(--content-max-width)",
          padding: "0 var(--space-12) var(--space-20)",
          margin: "0 auto",
        }}
      >
        <h2 className="section-label">Built With</h2>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "var(--space-3)",
            flexWrap: "wrap",
          }}
        >
          {BUILT_WITH.map((t) => (
            <span
              key={t.name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-4)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.8)",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              <t.Icon size={14} aria-hidden="true" />
              {t.name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
