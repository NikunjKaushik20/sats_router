"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Zap,
  Bot,
  Coins,
  UserPlus,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  Icon?: LucideIcon;
  /** When true, rendered as a primary CTA button */
  primary?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/providers", label: "Agents", Icon: Bot },
  { href: "/bounties", label: "Bounties", Icon: Coins },
  { href: "/providers/register", label: "Register Agent", Icon: UserPlus },
  { href: "/dashboard", label: "Live Dashboard", Icon: LayoutDashboard, primary: true },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: "var(--header-height)",
        padding: "0 var(--space-8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--border)",
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 1px 3px rgba(62, 39, 35, 0.04)",
      }}
    >
      {/* ── Logo ── */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          textDecoration: "none",
          color: "inherit",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "var(--radius-md)",
            background:
              "linear-gradient(135deg, var(--accent-violet), var(--accent-amber))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
          }}
        >
          <Zap size={17} aria-hidden="true" />
        </div>
        <div>
          <span
            style={{
              fontSize: "var(--text-md)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              display: "block",
              lineHeight: 1.2,
            }}
          >
            SatsRouter
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            Lightning Agent Economy
          </span>
        </div>
      </Link>

      {/* ── Desktop Navigation ── */}
      <nav
        className="hide-mobile"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href));

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="btn btn-primary"
                style={{ marginLeft: "var(--space-2)" }}
              >
                {item.label}
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: "var(--text-sm)",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                textDecoration: "none",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-sm)",
                fontWeight: isActive ? 700 : 500,
                background: isActive ? "rgba(62, 39, 35, 0.06)" : "transparent",
                transition: "all var(--transition-fast)",
                whiteSpace: "nowrap",
              }}
            >
              {item.Icon && <item.Icon size={14} aria-hidden="true" />}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Mobile Hamburger ── */}
      <button
        className="show-mobile"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          background: "transparent",
          cursor: "pointer",
          transition: "all var(--transition-fast)",
          color: "var(--text-primary)",
        }}
      >
        {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>

      {/* ── Mobile Menu Overlay ── */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            top: "var(--header-height)",
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(24px)",
            zIndex: 49,
            padding: "var(--space-6)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
            animation: "fadeInUp 0.2s ease-out",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  fontSize: "var(--text-lg)",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  textDecoration: "none",
                  padding: "var(--space-4) var(--space-4)",
                  borderRadius: "var(--radius-lg)",
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? "rgba(62, 39, 35, 0.06)" : "transparent",
                  transition: "all var(--transition-fast)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                {item.Icon && <item.Icon size={20} aria-hidden="true" />}
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
