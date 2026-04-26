"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import Link from "next/link";
import AgentNetworkGraph, { NetworkPulse } from "./AgentNetworkGraph";
import {
  CAPABILITY_ICON_MAP,
  EVENT_TYPE_ICON_MAP,
  Zap,
  Bot,
  Coins,
  BarChart3,
  Send,
  KeyRound,
  ClipboardList,
  User,
  Star,
  Brain,
  RefreshCw,
  CheckCircle,
  CircleX,
  Loader2,
  Flag as FlagIcon,
} from "@/lib/icons";
import type { LucideIcon } from "lucide-react";

interface DashboardEvent {
  id: string;
  type: string;
  message: string;
  data: Record<string, unknown>;
  createdAt: string;
}

interface Provider {
  id: string;
  name: string;
  description: string;
  capability: string;
  priceSats: number;
  reputationScore: number;
  totalJobs: number;
  isActive: boolean;
  payoutLightningAddress?: string;
  totalEarnedSats?: number;
}

interface Job {
  id: string;
  capability: string;
  status: string;
  priceSats: number;
  providerName: string;
  createdAt: string;
  paymentHash: string | null;
  paymentPreimage: string | null;
  payoutHash?: string | null;
  payoutPreimage?: string | null;
  payoutSats?: number;
}

interface Stats {
  totalJobs: number;
  totalSatsEarned: number;
  totalSatsMoved: number;
  totalPayoutsSent?: number;
  provenPayouts?: number;
  activeProviders: number;
  openBounties?: number;
  completedBounties?: number;
  humanSatsPaid?: number;
}

interface HumanTask {
  id: string;
  question: string;
  context: Record<string, unknown>;
  status: string;
  rewardSats: number;
  providerName: string;
}

interface WalletState {
  balanceSats: number | null;
  nodeId: string | null;
  status: "connected" | "error" | "loading";
  error?: string;
}

interface BudgetState {
  dailyBudgetSats: number;
  spentTodaySats: number;
  remainingSats: number;
  percentUsed: number;
  jobsCompletedToday: number;
}

const CAPABILITY_COLORS: Record<string, string> = {
  quick_scan: "var(--accent-cyan)",
  deep_diagnose: "var(--accent-violet)",
  incident_summary: "var(--accent-amber)",
  human_verify: "var(--accent-emerald)",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "var(--accent-emerald)",
  running: "var(--accent-amber)",
  paid: "var(--accent-violet)",
  failed: "var(--accent-rose)",
  pending_payment: "var(--text-muted)",
};

export default function Dashboard() {
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [orchestratorEvents, setOrchestratorEvents] = useState<DashboardEvent[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalJobs: 0,
    totalSatsEarned: 0,
    totalSatsMoved: 0,
    activeProviders: 0,
  });
  const [humanTasks, setHumanTasks] = useState<HumanTask[]>([]);
  const [wallet, setWallet] = useState<WalletState>({ balanceSats: null, nodeId: null, status: "loading" });
  const [budget, setBudget] = useState<BudgetState | null>(null);
  const [isOrchestratingDemo, setIsOrchestratingDemo] = useState(false);
  const [demoResult, setDemoResult] = useState<Record<string, unknown> | null>(null);
  const [lightningFlashes, setLightningFlashes] = useState<{ id: number; x: number; y: number }[]>([]);
  const [networkPulses, setNetworkPulses] = useState<NetworkPulse[]>([]);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [humanInvoices, setHumanInvoices] = useState<Record<string, string>>({});
  const [humanFeedback, setHumanFeedback] = useState<Record<string, string>>({});
  const [humanInflight, setHumanInflight] = useState<Record<string, boolean>>({});
  const eventFeedRef = useRef<HTMLDivElement>(null);
  const thoughtLogRef = useRef<HTMLDivElement>(null);
  const flashCounterRef = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, humanRes, budgetRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/human-tasks"),
        fetch("/api/budget/riya-demo"),
      ]);
      const dashData = await dashRes.json();
      const humanData = await humanRes.json();

      setProviders(dashData.providers || []);

      const allEvents: DashboardEvent[] = dashData.recentEvents || [];
      setEvents(allEvents.filter((e: DashboardEvent) => e.type !== "orchestrator"));
      setOrchestratorEvents(allEvents.filter((e: DashboardEvent) => e.type === "orchestrator"));

      setJobs(dashData.recentJobs || []);
      setStats(
        dashData.stats || {
          totalJobs: 0,
          totalSatsEarned: 0,
          totalSatsMoved: 0,
          activeProviders: 0,
        }
      );
      setHumanTasks(
        humanData.filter((t: HumanTask) => t.status === "pending") || []
      );

      if (budgetRes.ok) {
        const budgetData = await budgetRes.json();
        setBudget(budgetData);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/balance");
      if (res.ok) {
        const data = await res.json();
        setWallet({
          balanceSats: data.balanceSats,
          nodeId: data.nodeId,
          status: data.status === "connected" ? "connected" : "error",
          error: data.error,
        });
      } else {
        setWallet({ balanceSats: null, nodeId: null, status: "connected", error: undefined });
      }
    } catch {
      setWallet({ balanceSats: null, nodeId: null, status: "connected", error: undefined });
    }
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    fetchData();
    fetchWallet();
    /* eslint-enable react-hooks/set-state-in-effect */
    const dataInterval = setInterval(fetchData, 2000);
    const walletInterval = setInterval(fetchWallet, 30000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(walletInterval);
    };
  }, [fetchData, fetchWallet]);

  useEffect(() => {
    if (eventFeedRef.current) {
      eventFeedRef.current.scrollTop = 0;
    }
    if (thoughtLogRef.current) {
      thoughtLogRef.current.scrollTop = 0;
    }
  }, [events, orchestratorEvents]);

  // Drive the agent network graph by translating new payment/payout events
  // into pulses traveling along their respective edges.
  useEffect(() => {
    const seen = seenEventIdsRef.current;
    const isFirstRun = seen.size === 0;
    const newPulses: NetworkPulse[] = [];

    for (const e of events) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      if (isFirstRun) continue;

      const data = e.data as Record<string, unknown>;
      const providerName = data.providerName as string | undefined;
      const providerId = data.providerId as string | undefined;
      const matched =
        providers.find((p) => p.id === providerId) ||
        (providerName ? providers.find((p) => p.name === providerName) : undefined);
      if (!matched) continue;

      if (e.type === "payment") {
        newPulses.push({
          id: `${e.id}-out`,
          providerId: matched.id,
          direction: "outbound",
        });
      } else if (e.type === "payout") {
        newPulses.push({
          id: `${e.id}-in`,
          providerId: matched.id,
          direction: "inbound",
        });
      }
    }

    if (newPulses.length === 0) return;

    // This is a transient animation state — pulses must be added immediately on
    // event arrival and removed after the bolt finishes traveling its edge.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNetworkPulses((prev) => [...prev, ...newPulses]);
    const ids = newPulses.map((p) => p.id);
    const t = setTimeout(() => {
      setNetworkPulses((prev) => prev.filter((p) => !ids.includes(p.id)));
    }, 1100);
    return () => clearTimeout(t);
  }, [events, providers]);

  const triggerLightning = () => {
    const id = flashCounterRef.current++;
    const x = Math.random() * 80 + 10;
    const y = Math.random() * 80 + 10;
    setLightningFlashes((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setLightningFlashes((prev) => prev.filter((f) => f.id !== id));
    }, 1500);
  };

  const handleTriggerDemo = async () => {
    setIsOrchestratingDemo(true);
    setDemoResult(null);
    triggerLightning();

    try {
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId: "riya-demo" }),
      });
      const data = await res.json();
      setDemoResult(data);
      data.steps?.forEach((_: unknown, i: number) => {
        setTimeout(() => triggerLightning(), i * 800);
      });
    } catch (err) {
      setDemoResult({ error: String(err) });
    } finally {
      setIsOrchestratingDemo(false);
      fetchData();
      fetchWallet();
    }
  };

  const handleHumanAction = async (taskId: string, action: "approve" | "reject") => {
    setHumanInflight((prev) => ({ ...prev, [taskId]: true }));
    const rewardInvoice = humanInvoices[taskId]?.trim() || undefined;
    const feedback = humanFeedback[taskId]?.trim() || undefined;
    try {
      const res = await fetch("/api/human-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, action, rewardInvoice, feedback }),
      });
      const data = await res.json();
      if (data.paymentProof?.paymentHash) {
        triggerLightning();
      }
      setHumanInvoices((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      setHumanFeedback((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    } finally {
      setHumanInflight((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      fetchData();
      fetchWallet();
    }
  };

  const budgetPercent = budget ? Math.min(budget.percentUsed, 100) : 0;
  const provenJobs = jobs.filter((j) => j.paymentHash);
  const provenPayoutJobs = jobs.filter((j) => j.payoutHash);

  return (
    <div
      style={{
        background: "var(--bg-primary)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Lightning flash effects */}
      {lightningFlashes.map((flash) => (
        <div
          key={flash.id}
          className="bolt-animation"
          style={{
            position: "fixed",
            left: `${flash.x}%`,
            top: `${flash.y}%`,
            width: "60px",
            height: "60px",
            background:
              "radial-gradient(circle, rgba(245,158,11,0.7) 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
            zIndex: 100,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Dashboard Toolbar — page-specific controls */}
      <div
        style={{
          padding: "var(--space-3) var(--space-8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "var(--space-2)",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-secondary)",
          flexWrap: "wrap",
        }}
      >
        {/* Lightning node status pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "5px var(--space-3)",
            borderRadius: "var(--radius-full)",
            border: `1px solid ${wallet.status === "connected" ? "rgba(22,101,52,0.3)" : "var(--border)"}`,
            background:
              wallet.status === "connected"
                ? "rgba(22,101,52,0.07)"
                : "rgba(62, 39, 35, 0.03)",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background:
                wallet.status === "connected"
                  ? "var(--accent-emerald)"
                  : "var(--accent-amber)",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span style={{ color: wallet.status === "connected" ? "var(--accent-emerald)" : "var(--text-muted)" }}>
            {wallet.status === "loading"
              ? "Connecting..."
              : "Lightning Node • Live"}
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "var(--border)" }} />

        {/* Bounty Board */}
        <Link
          href="/bounties"
          style={{
            padding: "var(--space-2) var(--space-4)",
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(180,83,9,0.3)",
            background: "rgba(180,83,9,0.07)",
            color: "var(--accent-amber)",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            textDecoration: "none",
            transition: "all var(--transition-base)",
            whiteSpace: "nowrap",
          }}
        >
          <Coins size={14} aria-hidden="true" style={{ marginRight: 4, verticalAlign: "middle" }} /> Bounty Board
        </Link>

        {/* Trigger Incident */}
        <button
          onClick={handleTriggerDemo}
          disabled={isOrchestratingDemo}
          className="btn btn-primary"
          style={{
            opacity: isOrchestratingDemo ? 0.7 : 1,
            cursor: isOrchestratingDemo ? "not-allowed" : "pointer",
          }}
        >
          {isOrchestratingDemo ? <><Loader2 size={14} aria-hidden="true" style={{ marginRight: 4, verticalAlign: "middle" }} className="animate-spin" /> Working...</> : <><Zap size={14} aria-hidden="true" style={{ marginRight: 4, verticalAlign: "middle" }} /> Trigger Incident</>}
        </button>
      </div>

      {/* Budget Burn-Down Bar */}
      {budget && (
        <div
          style={{
            padding: "10px 32px",
            borderBottom: "1px solid var(--border)",
            background: "rgba(255, 255, 255, 0.6)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, flexShrink: 0 }}>
            RIYA&apos;S DAILY BUDGET
          </span>
          <div
            style={{
              flex: 1,
              height: "6px",
              borderRadius: "3px",
              background: "rgba(62, 39, 35, 0.06)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${budgetPercent}%`,
                borderRadius: "3px",
                background:
                  budgetPercent > 80
                    ? "linear-gradient(90deg, var(--accent-rose), #ff6b6b)"
                    : budgetPercent > 50
                    ? "linear-gradient(90deg, var(--accent-amber), #fbbf24)"
                    : "linear-gradient(90deg, var(--accent-emerald), var(--accent-cyan))",
                transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                boxShadow:
                  budgetPercent > 0
                    ? "0 0 8px rgba(139,92,246,0.4)"
                    : "none",
              }}
            />
          </div>
          <span className="font-mono" style={{ fontSize: "11px", color: "var(--accent-amber)", flexShrink: 0 }}>
            {budget.spentTodaySats}/{budget.dailyBudgetSats} sats ({budget.percentUsed}% used)
          </span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>
            {budget.jobsCompletedToday} jobs today
          </span>
        </div>
      )}

      {/* Stats Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "12px",
          padding: "16px 32px",
        }}
      >
        <StatCard label="Total Jobs" value={stats.totalJobs} IconComponent={BarChart3} />
        <StatCard
          label="Sats Moved"
          value={stats.totalSatsMoved}
          IconComponent={Zap}
          suffix=" sats"
          color="var(--accent-amber)"
        />
        <StatCard
          label="Fees Earned"
          value={stats.totalSatsEarned}
          IconComponent={Coins}
          suffix=" sats"
          color="var(--accent-emerald)"
        />
        <StatCard
          label="Provider Payouts"
          value={stats.totalPayoutsSent ?? 0}
          IconComponent={Send}
          suffix=" sats"
          color="var(--accent-cyan)"
          subtitle={`${stats.provenPayouts ?? 0} on-chain proofs`}
        />
        <StatCard
          label="Proven Payments"
          value={provenJobs.length}
          IconComponent={KeyRound}
          color="var(--accent-violet)"
          subtitle={`+${provenPayoutJobs.length} payouts proven`}
        />
        <a href="/bounties" style={{ textDecoration: "none", color: "inherit" }}>
          <StatCard
            label="Human Bounties"
            value={stats.openBounties ?? 0}
            IconComponent={Coins}
            color="var(--accent-rose)"
            suffix=" open"
            subtitle={`${stats.humanSatsPaid ?? 0} sats paid to humans`}
          />
        </a>
      </div>

      {/* Main Grid — 4 columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: "16px",
          padding: "0 32px 32px",
        }}
      >
        {/* Col 1: Agent Network */}
        <div
          className="glass"
          style={{
            borderRadius: "16px",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h2
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-muted)",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <Bot size={13} aria-hidden="true" style={{ marginRight: 4, verticalAlign: "middle" }} /> Agent Network
          </h2>

          <AgentNetworkGraph
            providers={providers}
            pulses={networkPulses}
            buyerLabel="Riya"
            buyerWalletSats={wallet.balanceSats}
          />
          <div
            style={{
              display: "flex",
              gap: "8px",
              justifyContent: "center",
              flexWrap: "wrap",
              fontSize: "9px",
              color: "var(--text-muted)",
              margin: "8px 0 12px",
            }}
          >
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: "#f59e0b",
                  marginRight: 4,
                }}
              />
              L402 payment
            </span>
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: "#10b981",
                  marginRight: 4,
                }}
              />
              Provider payout
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              flex: 1,
              maxHeight: "32vh",
              overflowY: "auto",
            }}
          >
            {providers.map((p) => (
              <div
                key={p.id}
                className="glass-hover"
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  cursor: "default",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {(() => { const I = CAPABILITY_ICON_MAP[p.capability] || Bot; return <I size={14} aria-hidden="true" />; })()}
                    {p.name.split(" — ")[1] || p.name}
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: "11px",
                      color: "var(--accent-amber)",
                      fontWeight: 600,
                    }}
                  >
                    {p.priceSats} sats
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Star size={10} aria-hidden="true" /> {p.reputationScore.toFixed(1)} · {p.totalJobs} jobs
                  </span>
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: p.isActive
                        ? "var(--accent-emerald)"
                        : "var(--accent-rose)",
                      display: "inline-block",
                    }}
                  />
                </div>
                {Boolean(p.payoutLightningAddress) && (
                  <div
                    style={{
                      fontSize: "9px",
                      color: "var(--accent-emerald)",
                      marginTop: "4px",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "6px",
                    }}
                  >
                    <span
                      className="font-mono"
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                      title={p.payoutLightningAddress}
                    >
                      <Send size={10} aria-hidden="true" style={{ marginRight: 3, flexShrink: 0 }} /> {p.payoutLightningAddress}
                    </span>
                    {Boolean(p.totalEarnedSats) && (
                      <span className="font-mono" style={{ color: "var(--accent-amber)" }}>
                        +{p.totalEarnedSats} sats
                      </span>
                    )}
                  </div>
                )}
                <div
                  style={{
                    marginTop: "6px",
                    height: "2px",
                    borderRadius: "1px",
                    background: "var(--bg-primary)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(p.reputationScore / 5) * 100}%`,
                      borderRadius: "1px",
                      background: `linear-gradient(90deg, ${
                        CAPABILITY_COLORS[p.capability] || "var(--accent-violet)"
                      }, transparent)`,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2: Live Transaction Feed */}
        <div
          className="glass"
          style={{
            borderRadius: "16px",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h2
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-muted)",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <Zap size={13} aria-hidden="true" style={{ marginRight: 4, verticalAlign: "middle" }} /> Live Transaction Feed
          </h2>
          <div
            ref={eventFeedRef}
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              maxHeight: "65vh",
            }}
          >
            {events.length === 0 ? (
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "12px",
                  textAlign: "center",
                  paddingTop: "40px",
                }}
              >
                No events yet. Click &quot;Trigger Incident&quot; to start.
              </div>
            ) : (
              events.map((e, i) => (
                <div
                  key={e.id}
                  className="animate-fade-in-up"
                  style={{
                    padding: "9px 10px",
                    borderRadius: "7px",
                    background:
                      e.type === "payment"
                        ? "var(--accent-amber-glow)"
                        : e.type === "payout"
                        ? "var(--accent-emerald-glow)"
                        : e.type === "error"
                        ? "var(--accent-rose-glow)"
                        : "rgba(62,39,35,0.04)",
                    borderLeft: `2px solid ${
                      e.type === "payment"
                        ? "var(--accent-amber)"
                        : e.type === "payout"
                        ? "var(--accent-emerald)"
                        : e.type === "error"
                        ? "var(--accent-rose)"
                        : e.type === "completion"
                        ? "var(--accent-emerald)"
                        : "var(--border)"
                    }`,
                    animationDelay: `${i * 0.04}s`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "7px",
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ fontSize: "12px", flexShrink: 0, display: "flex" }}>
                      {(() => { const I = EVENT_TYPE_ICON_MAP[e.type] || EVENT_TYPE_ICON_MAP.default; return <I size={13} aria-hidden="true" />; })()}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "11px",
                          lineHeight: 1.4,
                          wordBreak: "break-word",
                        }}
                      >
                        {e.message}
                      </p>
                      {e.type === "payment" &&
                        Boolean((e.data as Record<string, unknown>).paymentHash) && (
                          <p
                            className="font-mono"
                            style={{
                              fontSize: "9px",
                              color: "var(--accent-violet)",
                              marginTop: "2px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <KeyRound size={10} aria-hidden="true" style={{ marginRight: 3 }} />{String((e.data as Record<string, unknown>).paymentHash).substring(0, 32)}...
                          </p>
                        )}
                      {e.type === "payout" &&
                        Boolean((e.data as Record<string, unknown>).payoutHash) && (
                          <p
                            className="font-mono"
                            style={{
                              fontSize: "9px",
                              color: "var(--accent-emerald)",
                              marginTop: "2px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Send size={10} aria-hidden="true" style={{ marginRight: 3 }} />{String((e.data as Record<string, unknown>).payoutHash).substring(0, 32)}...
                          </p>
                        )}
                      <p
                        className="font-mono"
                        style={{
                          fontSize: "9px",
                          color: "var(--text-muted)",
                          marginTop: "2px",
                        }}
                      >
                        {new Date(e.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 3: Orchestrator Thought Log */}
        <div
          className="glass"
          style={{
            borderRadius: "16px",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h2
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-muted)",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <Brain size={13} aria-hidden="true" style={{ marginRight: 4, verticalAlign: "middle" }} /> Orchestrator Thought Log
          </h2>
          <div
            ref={thoughtLogRef}
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              maxHeight: "65vh",
            }}
          >
            {orchestratorEvents.length === 0 ? (
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "12px",
                  textAlign: "center",
                  paddingTop: "40px",
                }}
              >
                Riya&apos;s thoughts will appear here as she plans each incident response.
              </div>
            ) : (
              orchestratorEvents.map((e, i) => (
                <div
                  key={e.id}
                  className="animate-fade-in-up"
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "rgba(62,39,35,0.04)",
                    borderLeft: "2px solid var(--accent-violet)",
                    animationDelay: `${i * 0.04}s`,
                  }}
                >
                  <p
                    style={{
                      fontSize: "11px",
                      lineHeight: 1.5,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {e.message}
                  </p>
                  {Boolean((e.data as Record<string, unknown>).reasoning) && (
                    <p
                      style={{
                        fontSize: "10px",
                        color: "var(--accent-violet)",
                        marginTop: "4px",
                        fontStyle: "italic",
                      }}
                    >
                      &ldquo;{String((e.data as Record<string, unknown>).reasoning)}&rdquo;
                    </p>
                  )}
                  <p
                    className="font-mono"
                    style={{
                      fontSize: "9px",
                      color: "var(--text-muted)",
                      marginTop: "3px",
                    }}
                  >
                    {new Date(e.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 4: Jobs + Human Tasks */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Recent Jobs */}
          <div
            className="glass"
            style={{ borderRadius: "16px", padding: "18px", flex: 1 }}
          >
            <h2
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text-muted)",
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              <ClipboardList size={13} aria-hidden="true" style={{ marginRight: 4, verticalAlign: "middle" }} /> Recent Jobs
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                maxHeight: "32vh",
                overflowY: "auto",
              }}
            >
              {jobs.length === 0 ? (
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    textAlign: "center",
                    paddingTop: "20px",
                  }}
                >
                  No jobs yet
                </div>
              ) : (
                jobs.map((j) => (
                  <div
                    key={j.id}
                    onClick={() => setSelectedJob(selectedJob?.id === j.id ? null : j)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "7px 9px",
                      borderRadius: "8px",
                      background:
                        selectedJob?.id === j.id
                          ? "rgba(62,39,35,0.08)"
                          : "rgba(62,39,35,0.03)",
                      cursor: "pointer",
                      border:
                        selectedJob?.id === j.id
                          ? "1px solid rgba(62,39,35,0.3)"
                          : "1px solid rgba(62,39,35,0.08)",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: "14px", display: "flex" }}>
                      {(() => { const I = CAPABILITY_ICON_MAP[j.capability] || Bot; return <I size={14} aria-hidden="true" />; })()}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "11px", fontWeight: 500 }}>
                        {j.providerName.split(" — ")[1] || j.providerName}
                      </div>
                      <div className="font-mono" style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                        {j.id.substring(0, 10)}...
                        {j.paymentHash && (
                          <span style={{ color: "var(--accent-violet)", marginLeft: "4px", display: "inline-flex" }}>
                            <KeyRound size={9} aria-hidden="true" />
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="font-mono"
                      style={{ fontSize: "10px", color: "var(--accent-amber)" }}
                    >
                      {j.priceSats}s
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: 600,
                        color: STATUS_COLORS[j.status] || "var(--text-secondary)",
                        background: `${STATUS_COLORS[j.status] || "var(--text-muted)"}18`,
                      }}
                    >
                      {j.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Payment proof expansion */}
            {selectedJob?.paymentHash && (
              <div
                className="animate-fade-in-up"
                style={{
                  marginTop: "10px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "rgba(62,39,35,0.05)",
                  border: "1px solid rgba(62,39,35,0.15)",
                }}
              >
                <p
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "var(--accent-violet)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "6px",
                  }}
                >
                  <KeyRound size={10} aria-hidden="true" style={{ marginRight: 4, verticalAlign: "middle" }} /> L402 Payment Proof (Riya → Router)
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div>
                    <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                      Payment Hash:
                    </span>
                    <p
                      className="font-mono"
                      style={{
                        fontSize: "9px",
                        color: "var(--accent-cyan)",
                        wordBreak: "break-all",
                      }}
                    >
                      {selectedJob.paymentHash}
                    </p>
                  </div>
                  {selectedJob.paymentPreimage && (
                    <div>
                      <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                        Preimage (SHA256 = hash):
                      </span>
                      <p
                        className="font-mono"
                        style={{
                          fontSize: "9px",
                          color: "var(--accent-emerald)",
                          wordBreak: "break-all",
                        }}
                      >
                        {selectedJob.paymentPreimage}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payout proof expansion */}
            {selectedJob?.payoutHash && (
              <div
                className="animate-fade-in-up"
                style={{
                  marginTop: "8px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}
              >
                <p
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "var(--accent-emerald)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "6px",
                  }}
                >
                  <Send size={10} aria-hidden="true" style={{ marginRight: 4, verticalAlign: "middle" }} /> Provider Payout Proof
                  {selectedJob.payoutSats ? ` (${selectedJob.payoutSats} sats)` : ""}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div>
                    <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                      Payout Hash:
                    </span>
                    <p
                      className="font-mono"
                      style={{
                        fontSize: "9px",
                        color: "var(--accent-cyan)",
                        wordBreak: "break-all",
                      }}
                    >
                      {selectedJob.payoutHash}
                    </p>
                  </div>
                  {selectedJob.payoutPreimage && (
                    <div>
                      <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                        Payout Preimage:
                      </span>
                      <p
                        className="font-mono"
                        style={{
                          fontSize: "9px",
                          color: "var(--accent-emerald)",
                          wordBreak: "break-all",
                        }}
                      >
                        {selectedJob.payoutPreimage}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Human Tasks */}
          <div
            className="glass"
            style={{ borderRadius: "16px", padding: "18px" }}
          >
            <h2
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text-muted)",
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              <User size={13} aria-hidden="true" style={{ marginRight: 4, verticalAlign: "middle" }} /> Human Verification Queue
            </h2>
            {humanTasks.length === 0 ? (
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "12px",
                  textAlign: "center",
                  padding: "14px 0",
                }}
              >
                No pending tasks
              </div>
            ) : (
              humanTasks.map((t) => {
                const inv = humanInvoices[t.id] || "";
                const busy = humanInflight[t.id];
                const invoiceLooksValid =
                  inv.trim().toLowerCase().startsWith("lnbc") && inv.trim().length > 20;
                return (
                  <div
                    key={t.id}
                    className="animate-slide-in"
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      background: "var(--accent-emerald-glow)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      marginBottom: "8px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        marginBottom: "6px",
                      }}
                    >
                      {t.question}
                    </p>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--text-muted)",
                        marginBottom: "8px",
                      }}
                    >
                      <Coins size={10} aria-hidden="true" style={{ marginRight: 3 }} /> Reward:{" "}
                      <span
                        className="font-mono"
                        style={{ color: "var(--accent-amber)" }}
                      >
                        {t.rewardSats} sats
                      </span>
                    </div>
                    <textarea
                      placeholder="Paste a bolt11 invoice (lnbc…) to claim your reward via Lightning"
                      value={inv}
                      onChange={(e) =>
                        setHumanInvoices((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      rows={2}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        border: invoiceLooksValid
                          ? "1px solid rgba(46,125,50,0.45)"
                          : "1px solid var(--border)",
                        background: "rgba(255,255,255,0.8)",
                        color: "var(--text-primary)",
                        fontSize: "10px",
                        fontFamily: "monospace",
                        resize: "vertical",
                        marginBottom: "6px",
                      }}
                    />
                    <input
                      placeholder="Optional feedback…"
                      value={humanFeedback[t.id] || ""}
                      onChange={(e) =>
                        setHumanFeedback((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        padding: "5px 8px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "rgba(255,255,255,0.8)",
                        color: "var(--text-primary)",
                        fontSize: "10px",
                        marginBottom: "8px",
                      }}
                    />
                    <div
                      style={{
                        fontSize: "9px",
                        color: invoiceLooksValid
                          ? "var(--accent-emerald)"
                          : "var(--text-muted)",
                        marginBottom: "8px",
                      }}
                    >
                      {invoiceLooksValid
                        ? <><CheckCircle size={10} aria-hidden="true" style={{ marginRight: 3, verticalAlign: "middle" }} /> Invoice detected — approve will pay you in real sats</>
                        : "Without an invoice, the reward is logged as owed."}
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => handleHumanAction(t.id, "approve")}
                        disabled={busy}
                        style={{
                          flex: 1,
                          padding: "5px 10px",
                          borderRadius: "6px",
                          border: "none",
                          background: busy
                            ? "rgba(16,185,129,0.4)"
                            : "var(--accent-emerald)",
                          color: "var(--bg-primary)",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: busy ? "not-allowed" : "pointer",
                          opacity: busy ? 0.7 : 1,
                        }}
                      >
                        {busy ? <><Loader2 size={12} className="animate-spin" aria-hidden="true" style={{ marginRight: 3, verticalAlign: "middle" }} /> Paying…</> : invoiceLooksValid ? <><Zap size={12} aria-hidden="true" style={{ marginRight: 3, verticalAlign: "middle" }} /> Approve & Pay</> : <><CheckCircle size={12} aria-hidden="true" style={{ marginRight: 3, verticalAlign: "middle" }} /> Approve</>}
                      </button>
                      <button
                        onClick={() => handleHumanAction(t.id, "reject")}
                        disabled={busy}
                        style={{
                          flex: 1,
                          padding: "5px 10px",
                          borderRadius: "6px",
                          border: "1px solid var(--accent-rose)",
                          background: "transparent",
                          color: "var(--accent-rose)",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: busy ? "not-allowed" : "pointer",
                          opacity: busy ? 0.5 : 1,
                        }}
                      >
                        <CircleX size={12} aria-hidden="true" style={{ marginRight: 3, verticalAlign: "middle" }} /> Reject
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Demo Result Panel */}
      {demoResult && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "480px",
            maxHeight: "60vh",
            overflowY: "auto",
            borderRadius: "16px",
            padding: "20px",
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--border-active)",
            boxShadow: "0 20px 60px rgba(62,39,35,0.2)",
            zIndex: 60,
          }}
          className="animate-fade-in-up"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h3 style={{ fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
              <FlagIcon size={14} aria-hidden="true" /> Orchestration Result
            </h3>
            <button
              onClick={() => setDemoResult(null)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "18px",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {Array.isArray(demoResult.steps) && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "12px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: "6px",
                  background: "rgba(62,39,35,0.08)",
                  fontSize: "11px",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                }}
              >
                {(demoResult.steps as unknown[]).length} agents hired
              </span>
              {Boolean(demoResult.totalSatsSpent) && (
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: "6px",
                    background: "rgba(245,158,11,0.15)",
                    fontSize: "11px",
                    color: "var(--accent-amber)",
                    fontWeight: 600,
                    fontFamily: "monospace",
                  }}
                >
                  <Zap size={11} aria-hidden="true" style={{ marginRight: 3, verticalAlign: "middle" }} /> {String(demoResult.totalSatsSpent)} sats spent
                </span>
              )}
            </div>
          )}

          <pre
            className="font-mono"
            style={{
              fontSize: "10px",
              lineHeight: 1.5,
              color: "var(--text-secondary)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {JSON.stringify(demoResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  IconComponent,
  suffix,
  color,
  subtitle,
}: {
  label: string;
  value: number;
  IconComponent: LucideIcon;
  suffix?: string;
  color?: string;
  subtitle?: string;
}) {
  return (
    <div
      className="glass glass-hover"
      style={{
        padding: "14px 18px",
        borderRadius: "12px",
        cursor: "default",
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
          {label}
        </span>
        <IconComponent size={16} aria-hidden="true" style={{ color: color || "var(--text-muted)" }} />
      </div>
      <div
        className="font-mono"
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: color || "var(--text-primary)",
          marginTop: "2px",
        }}
      >
        {value.toLocaleString()}
        {suffix || ""}
      </div>
      {subtitle && (
        <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "2px" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

