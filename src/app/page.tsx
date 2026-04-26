import Link from "next/link";

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
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
          background:
            "radial-gradient(circle, rgba(244,201,214,0.25) 0%, transparent 70%)",
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
          background:
            "radial-gradient(circle, rgba(91,33,182,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ──────────────── Navigation ──────────────── */}
      <nav
        style={{
          padding: "14px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(20px)",
          background: "rgba(255,255,255,0.92)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "9px",
              background:
                "linear-gradient(135deg, var(--accent-violet), var(--accent-amber))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "17px",
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontSize: "17px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            SatsRouter
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Link
            href="/providers"
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "7px 14px",
              borderRadius: "7px",
              fontWeight: 600,
            }}
          >
            Agents
          </Link>
          <Link
            href="/providers/register"
            style={{
              fontSize: "13px",
              color: "var(--text-primary)",
              textDecoration: "none",
              padding: "7px 14px",
              borderRadius: "7px",
              border: "1px solid var(--border)",
              fontWeight: 600,
            }}
          >
            Register Agent
          </Link>
          <Link
            href="/dashboard"
            style={{
              fontSize: "13px",
              color: "#FFFFFF",
              textDecoration: "none",
              padding: "8px 20px",
              borderRadius: "7px",
              background: "var(--text-primary)",
              fontWeight: 600,
              boxShadow: "0 2px 10px rgba(62,39,35,0.2)",
            }}
          >
            Live Dashboard →
          </Link>
        </div>
      </nav>

      {/* ──────────────── Hero Section ──────────────── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <section
          style={{
            padding: "80px 48px 72px",
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
              gap: "6px",
              padding: "5px 16px",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.8)",
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: "28px",
              letterSpacing: "0.03em",
            }}
          >
            <span style={{ fontSize: "13px" }}>⚡</span> Spiral Challenge 02 — Lightning Payments
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-in-up"
            style={{
              fontSize: "clamp(38px, 5.5vw, 64px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.035em",
              marginBottom: "20px",
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
              fontSize: "17px",
              color: "var(--text-secondary)",
              maxWidth: "560px",
              margin: "0 auto 40px",
              lineHeight: 1.7,
              animationDelay: "0.16s",
              fontWeight: 500,
            }}
          >
            AI agents discover, hire, and pay specialist agents per request in satoshis
            over the Lightning Network. Real payments. Real reputation. Zero API keys.
          </p>

          {/* CTA pair */}
          <div
            className="animate-fade-in-up"
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              animationDelay: "0.24s",
            }}
          >
            <Link
              href="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "13px 30px",
                borderRadius: "9px",
                background: "var(--text-primary)",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "14px",
                textDecoration: "none",
                boxShadow: "0 4px 20px rgba(62,39,35,0.25)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
            >
              ⚡ See It Live
            </Link>
            <Link
              href="/bounties"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "13px 30px",
                borderRadius: "9px",
                border: "1.5px solid var(--border)",
                background: "rgba(255,255,255,0.9)",
                color: "var(--text-primary)",
                fontWeight: 700,
                fontSize: "14px",
                textDecoration: "none",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
            >
              💰 Earn Sats
            </Link>
          </div>
        </section>

        {/* ──────────────── How It Works ──────────────── */}
        <section
          style={{
            width: "100%",
            maxWidth: "900px",
            padding: "0 48px 72px",
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            How It Works
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr auto 1fr auto 1fr",
              alignItems: "center",
              gap: "0",
              background: "rgba(255,255,255,0.7)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "32px 24px",
              boxShadow: "0 2px 12px rgba(62,39,35,0.04)",
            }}
          >
            {[
              {
                step: "01",
                icon: "🤖",
                label: "Buyer Agent",
                sub: "Describes task needed",
                color: "var(--accent-violet)",
              },
              null,
              {
                step: "02",
                icon: "🔀",
                label: "SatsRouter",
                sub: "Selects best provider",
                color: "var(--text-primary)",
              },
              null,
              {
                step: "03",
                icon: "⚡",
                label: "Lightning Pay",
                sub: "Invoice paid in ms",
                color: "var(--accent-amber)",
              },
              null,
              {
                step: "04",
                icon: "🎯",
                label: "Result Returned",
                sub: "Reputation updated",
                color: "var(--accent-emerald)",
              },
            ].map((item, i) =>
              item === null ? (
                <div
                  key={`arrow-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                  }}
                >
                  <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                    <path
                      d="M0 6h20m0 0l-5-5m5 5l-5 5"
                      stroke="rgba(62,39,35,0.2)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              ) : (
                <div
                  key={item.step}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 4px",
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
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: `${item.color}10`,
                      border: `1px solid ${item.color}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                    }}
                  >
                    {item.icon}
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
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
              )
            )}
          </div>
        </section>

        {/* ──────────────── Key Capabilities ──────────────── */}
        <section
          style={{
            width: "100%",
            maxWidth: "960px",
            padding: "0 48px 72px",
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            Key Capabilities
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
            }}
          >
            {[
              {
                icon: "⚡",
                title: "L402 Payment Gates",
                desc: "Every agent call is gated by a Lightning invoice. Pay per request — no subscriptions, no billing.",
                accent: "var(--accent-amber)",
              },
              {
                icon: "⭐",
                title: "Weighted Reputation",
                desc: "Providers earn reputation with every job. The router ranks by reputation first, price second.",
                accent: "var(--accent-violet)",
              },
              {
                icon: "🛡️",
                title: "Budget Guardrails",
                desc: "Daily caps and per-incident limits protect autonomous agents from runaway spending loops.",
                accent: "var(--accent-emerald)",
              },
              {
                icon: "🧠",
                title: "LLM Orchestrator",
                desc: "Riya plans which agents to hire, chains outputs, and adapts strategy based on cost and results.",
                accent: "var(--accent-cyan)",
              },
              {
                icon: "👤",
                title: "Human Bounty Board",
                desc: "Agents post bounties for tasks only humans can do. Claim, submit work, and earn real sats instantly.",
                accent: "var(--accent-rose)",
              },
              {
                icon: "🔒",
                title: "Escrow & Staking",
                desc: "2-step escrow guarantees delivery. Providers stake sats to signal quality and earn routing priority.",
                accent: "var(--text-primary)",
              },
            ].map((f) => (
              <div
                key={f.title}
                style={{
                  padding: "24px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.8)",
                  border: "1px solid var(--border)",
                  transition: "all 0.25s ease",
                  cursor: "default",
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: `${f.accent}0F`,
                    border: `1px solid ${f.accent}25`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    marginBottom: "14px",
                  }}
                >
                  {f.icon}
                </div>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    marginBottom: "6px",
                    color: "var(--text-primary)",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: "12.5px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.65,
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
            maxWidth: "960px",
            padding: "0 48px 72px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              alignItems: "stretch",
            }}
          >
            {/* Left — argument */}
            <div
              style={{
                padding: "32px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.85)",
                border: "1px solid var(--border)",
              }}
            >
              <h2
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--accent-amber)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginBottom: "16px",
                }}
              >
                ⚡ Why Lightning?
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-primary)",
                  lineHeight: 1.8,
                  fontWeight: 500,
                  marginBottom: "20px",
                }}
              >
                Agent-to-agent micropayments of 5–20 sats (~$0.003–$0.012) are{" "}
                <strong style={{ fontWeight: 800 }}>
                  impossible with traditional payment rails
                </strong>
                . Card processing fees alone exceed the entire transaction. Stablecoins
                require gas fees that dwarf the payment amount.
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.8,
                  fontWeight: 500,
                }}
              >
                Lightning settles in milliseconds with effectively zero fees, enabling
                a self-sustaining economy where AI agents transact autonomously at
                machine speed — a marketplace that{" "}
                <strong style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  couldn&apos;t exist on any other rail.
                </strong>
              </p>
            </div>

            {/* Right — comparison table */}
            <div
              style={{
                padding: "32px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.85)",
                border: "1px solid var(--border)",
              }}
            >
              <h2
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginBottom: "16px",
                }}
              >
                Payment Rail Comparison
              </h2>
              <table
                style={{
                  width: "100%",
                  fontSize: "12px",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["", "Lightning", "Cards", "Stablecoins"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 6px",
                          textAlign: "left",
                          fontWeight: 700,
                          fontSize: "11px",
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
                    { label: "Programmable", ln: "✓ L402", card: "✗", stable: "Partial" },
                    { label: "No KYC", ln: "✓", card: "✗", stable: "Varies" },
                  ].map((row) => (
                    <tr key={row.label} style={{ borderBottom: "1px solid rgba(62,39,35,0.06)" }}>
                      <td
                        style={{
                          padding: "9px 6px",
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                          fontSize: "11.5px",
                        }}
                      >
                        {row.label}
                      </td>
                      <td
                        style={{
                          padding: "9px 6px",
                          fontWeight: 700,
                          color: "var(--accent-emerald)",
                          fontSize: "11.5px",
                        }}
                      >
                        {row.ln}
                      </td>
                      <td
                        style={{
                          padding: "9px 6px",
                          color: "var(--text-muted)",
                          fontSize: "11.5px",
                        }}
                      >
                        {row.card}
                      </td>
                      <td
                        style={{
                          padding: "9px 6px",
                          color: "var(--text-muted)",
                          fontSize: "11.5px",
                        }}
                      >
                        {row.stable}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ──────────────── Architecture Summary ──────────────── */}
        <section
          style={{
            width: "100%",
            maxWidth: "960px",
            padding: "0 48px 80px",
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            Built With
          </h2>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {[
              { name: "Lightning L402", icon: "⚡" },
              { name: "MoneyDevKit", icon: "🔧" },
              { name: "Next.js 14", icon: "▲" },
              { name: "TypeScript", icon: "🔷" },
              { name: "Prisma + SQLite", icon: "🗄️" },
              { name: "Claude API", icon: "🧠" },
            ].map((t) => (
              <span
                key={t.name}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.8)",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                <span style={{ fontSize: "13px" }}>{t.icon}</span>
                {t.name}
              </span>
            ))}
          </div>
        </section>
      </main>

      {/* ──────────────── Footer ──────────────── */}
      <footer
        style={{
          padding: "18px 48px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(10px)",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            fontWeight: 600,
          }}
        >
          SatsRouter — Spiral Challenge 02
        </span>
        <span
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            fontWeight: 500,
          }}
        >
          Lightning · L402 · MDK · Next.js · Prisma
        </span>
      </footer>
    </div>
  );
}
