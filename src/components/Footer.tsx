import Link from "next/link";
import {
  Zap,
  Wrench,
  Triangle,
  Code2,
  Database,
  Brain,
  ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FOOTER_LINKS = {
  product: [
    { href: "/dashboard", label: "Live Dashboard" },
    { href: "/providers", label: "Agent Directory" },
    { href: "/bounties", label: "Bounty Board" },
    { href: "/providers/register", label: "Register Agent" },
  ],
  technology: [
    { href: "https://docs.moneydevkit.com", label: "MoneyDevKit", external: true },
    { href: "https://lsat.tech", label: "L402 Protocol", external: true },
    { href: "https://lightning.network", label: "Lightning Network", external: true },
  ],
  hackathon: [
    { href: "https://github.com/nikunjkaushik20/sats_router", label: "Source Code", external: true },
  ],
};

const TECH_BADGES: { name: string; Icon: LucideIcon }[] = [
  { name: "Lightning L402", Icon: Zap },
  { name: "MoneyDevKit", Icon: Wrench },
  { name: "Next.js", Icon: Triangle },
  { name: "TypeScript", Icon: Code2 },
  { name: "Prisma", Icon: Database },
  { name: "Claude API", Icon: Brain },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border)",
        marginTop: "auto",
      }}
    >
      {/* Main Footer Content */}
      <div
        style={{
          maxWidth: "var(--max-width)",
          margin: "0 auto",
          padding: "var(--space-10) var(--space-8) var(--space-8)",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: "var(--space-8)",
        }}
      >
        {/* Brand Column */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              marginBottom: "var(--space-4)",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "var(--radius-md)",
                background:
                  "linear-gradient(135deg, var(--accent-violet), var(--accent-amber))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
              }}
            >
              <Zap size={15} aria-hidden="true" />
            </div>
            <span
              style={{
                fontSize: "var(--text-md)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              SatsRouter
            </span>
          </div>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
              lineHeight: "var(--leading-normal)",
              maxWidth: 280,
              marginBottom: "var(--space-5)",
            }}
          >
            The economic layer for autonomous AI agents. Real Lightning payments.
            Real reputation. Zero API keys.
          </p>

          {/* Tech Badges */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              flexWrap: "wrap",
            }}
          >
            {TECH_BADGES.map((t) => (
              <span
                key={t.name}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                }}
              >
                <t.Icon size={11} aria-hidden="true" />
                {t.name}
              </span>
            ))}
          </div>
        </div>

        {/* Product Links */}
        <div>
          <h4
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "var(--space-4)",
            }}
          >
            Product
          </h4>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {FOOTER_LINKS.product.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Technology Links */}
        <div>
          <h4
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "var(--space-4)",
            }}
          >
            Technology
          </h4>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {FOOTER_LINKS.technology.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "var(--text-sm)",
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  {link.label}
                  <ExternalLink size={11} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Hackathon Links */}
        <div>
          <h4
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "var(--space-4)",
            }}
          >
            Hackathon
          </h4>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {FOOTER_LINKS.hackathon.map((link) => (
              <li key={link.label}>
                {"external" in link && link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: "var(--text-sm)",
                      color: "var(--text-secondary)",
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    {link.label}
                    <ExternalLink size={11} aria-hidden="true" />
                  </a>
                ) : (
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--text-secondary)",
                      fontWeight: 500,
                    }}
                  >
                    {link.label}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div
            style={{
              marginTop: "var(--space-5)",
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(180, 83, 9, 0.2)",
              background: "var(--accent-amber-glow)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Zap size={12} aria-hidden="true" style={{ color: "var(--accent-amber)" }} />
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--accent-amber)",
                lineHeight: 1.4,
              }}
            >
              Hack Nation Global AI Hackathon<br />Spiral Challenge 02
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "var(--space-4) var(--space-8)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "var(--max-width)",
          margin: "0 auto",
        }}
      >
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            fontWeight: 500,
          }}
        >
          &copy; {currentYear} SatsRouter. Built for Hack Nation Global AI Hackathon &mdash; Spiral Challenge 02.
        </span>
        <span
          style={{
            fontSize: "10px",
            color: "var(--text-muted)",
            fontWeight: 500,
          }}
        >
          Lightning &middot; L402 &middot; MDK &middot; Next.js &middot; Prisma
        </span>
      </div>
    </footer>
  );
}
