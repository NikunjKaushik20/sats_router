"use client";

import { useMemo } from "react";

export interface NetworkProvider {
  id: string;
  name: string;
  capability: string;
  priceSats: number;
  reputationScore: number;
  totalJobs: number;
  isActive: boolean;
}

export interface NetworkPulse {
  id: string | number;
  providerId: string;
  direction: "outbound" | "inbound";
}

interface Props {
  providers: NetworkProvider[];
  pulses: NetworkPulse[];
  buyerLabel?: string;
  buyerWalletSats?: number | null;
}

const CAPABILITY_COLOR: Record<string, string> = {
  quick_scan:       "#5B21B6",
  deep_diagnose:    "#B45309",
  incident_summary: "#166534",
  human_verify:     "#1E40AF",
  code_review:      "#9B1C1C",
};

const CAPABILITY_LABEL: Record<string, string> = {
  quick_scan:       "Quick Scan",
  deep_diagnose:    "Deep Diagnose",
  incident_summary: "Storyteller",
  human_verify:     "Human Verify",
  code_review:      "Code Review",
};

const CAPABILITY_ICON: Record<string, string> = {
  quick_scan:       "🔍",
  deep_diagnose:    "🔬",
  incident_summary: "📝",
  human_verify:     "👤",
  code_review:      "💻",
};

export default function AgentNetworkGraph({
  providers,
  pulses,
  buyerLabel = "Riya",
}: Props) {
  const VIEW = 360;
  const CENTER = VIEW / 2;
  const RADIUS = 120;

  const positioned = useMemo(() => {
    const list = providers.slice(0, 8);
    const n = Math.max(list.length, 1);
    return list.map((p, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      return {
        ...p,
        x: CENTER + RADIUS * Math.cos(angle),
        y: CENTER + RADIUS * Math.sin(angle),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers]);

  return (
    <div style={{ width: "100%" }}>
      {/* Graph */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", maxWidth: "340px", margin: "0 auto" }}>
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          style={{ width: "100%", height: "100%", overflow: "visible" }}
        >
          <defs>
            <filter id="node-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(62,39,35,0.15)" />
            </filter>
            <filter id="center-shadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(62,39,35,0.2)" />
            </filter>
          </defs>

          {/* Edges */}
          {positioned.map((p) => {
            const color = CAPABILITY_COLOR[p.capability] || "#5B21B6";
            const dim = !p.isActive;
            return (
              <line
                key={`edge-${p.id}`}
                x1={CENTER} y1={CENTER}
                x2={p.x} y2={p.y}
                stroke={color}
                strokeOpacity={dim ? 0.12 : 0.25}
                strokeWidth={1.5}
                strokeDasharray="4 5"
              />
            );
          })}

          {/* Payment pulses */}
          {pulses.map((pulse) => {
            const target = positioned.find((p) => p.id === pulse.providerId);
            if (!target) return null;
            const color = CAPABILITY_COLOR[target.capability] || "#5B21B6";
            const fromX = pulse.direction === "outbound" ? CENTER : target.x;
            const fromY = pulse.direction === "outbound" ? CENTER : target.y;
            const toX   = pulse.direction === "outbound" ? target.x : CENTER;
            const toY   = pulse.direction === "outbound" ? target.y : CENTER;
            return (
              <g key={`pulse-${pulse.id}`}>
                <circle r={5} fill={color} opacity={0.9}>
                  <animate attributeName="cx" from={fromX} to={toX} dur="0.85s" fill="freeze" />
                  <animate attributeName="cy" from={fromY} to={toY} dur="0.85s" fill="freeze" />
                  <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="0.85s" fill="freeze" />
                </circle>
              </g>
            );
          })}

          {/* Provider nodes */}
          {positioned.map((p) => {
            const color = CAPABILITY_COLOR[p.capability] || "#5B21B6";
            const dim = !p.isActive;
            const shortName = p.name.replace(/^Agent [A-Z] — /, "").replace("Agent ", "");
            return (
              <g key={`node-${p.id}`} opacity={dim ? 0.4 : 1}>
                {/* Outer ring */}
                <circle
                  cx={p.x} cy={p.y} r={24}
                  fill="white"
                  stroke={color}
                  strokeWidth={1.5}
                  filter="url(#node-shadow)"
                />
                {/* Icon */}
                <text
                  x={p.x} y={p.y - 4}
                  textAnchor="middle"
                  fontSize={13}
                  dominantBaseline="middle"
                >
                  {CAPABILITY_ICON[p.capability] || "🤖"}
                </text>
                {/* Price */}
                <text
                  x={p.x} y={p.y + 10}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight="700"
                  fill={color}
                  style={{ fontFamily: "system-ui" }}
                >
                  {p.priceSats}s
                </text>
                {/* Agent name below node */}
                <text
                  x={p.x} y={p.y + 33}
                  textAnchor="middle"
                  fontSize={8.5}
                  fontWeight="600"
                  fill="rgba(62,39,35,0.85)"
                  style={{ fontFamily: "system-ui" }}
                >
                  {shortName}
                </text>
                {/* Reputation */}
                <text
                  x={p.x} y={p.y + 44}
                  textAnchor="middle"
                  fontSize={7.5}
                  fill="rgba(62,39,35,0.5)"
                  style={{ fontFamily: "system-ui" }}
                >
                  ⭐ {p.reputationScore.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Center node — Riya (buyer) */}
          <g>
            <circle
              cx={CENTER} cy={CENTER} r={30}
              fill="white"
              stroke="rgba(62,39,35,0.8)"
              strokeWidth={2}
              filter="url(#center-shadow)"
            />
            <text
              x={CENTER} y={CENTER - 6}
              textAnchor="middle"
              fontSize={16}
              dominantBaseline="middle"
            >
              🤖
            </text>
            <text
              x={CENTER} y={CENTER + 10}
              textAnchor="middle"
              fontSize={9}
              fontWeight="700"
              fill="rgba(62,39,35,0.9)"
              style={{ fontFamily: "system-ui" }}
            >
              {buyerLabel}
            </text>
            <text
              x={CENTER} y={CENTER + 22}
              textAnchor="middle"
              fontSize={7}
              fill="rgba(62,39,35,0.45)"
              style={{ fontFamily: "system-ui" }}
            >
              buyer agent
            </text>
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div style={{
        marginTop: "12px",
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        justifyContent: "center",
      }}>
        {Object.entries(CAPABILITY_LABEL).map(([cap, label]) => {
          const hasProvider = providers.some((p) => p.capability === cap);
          if (!hasProvider) return null;
          return (
            <span
              key={cap}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                borderRadius: "999px",
                background: `${CAPABILITY_COLOR[cap]}14`,
                border: `1px solid ${CAPABILITY_COLOR[cap]}40`,
                fontSize: "9px",
                fontWeight: 600,
                color: CAPABILITY_COLOR[cap],
              }}
            >
              {CAPABILITY_ICON[cap]} {label}
            </span>
          );
        })}
      </div>

      {/* Flow explanation */}
      <p style={{
        marginTop: "10px",
        fontSize: "10px",
        color: "rgba(62,39,35,0.45)",
        textAlign: "center",
        lineHeight: 1.5,
      }}>
        Riya routes each task to the best agent by reputation + price.<br />
        Animated pulses show live Lightning payments.
      </p>
    </div>
  );
}
