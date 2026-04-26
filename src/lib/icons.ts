/**
 * Shared Lucide icon mappings used across the SatsRouter UI.
 * This module centralizes icon assignment so no file needs to import
 * individual icons redundantly.
 */

import {
  Search,
  Microscope,
  FileText,
  ShieldCheck,
  MessageSquare,
  TrendingUp,
  Settings,
  Zap,
  Star,
  Banknote,
  RefreshCw,
  CheckCircle,
  Brain,
  User,
  Tag,
  Ban,
  Bomb,
  AlertTriangle,
  Lock,
  BarChart3,
  ClipboardList,
  MapPin,
  ArrowRightLeft,
  Hash,
  Flag,
  Pencil,
  Clock,
  CircleCheck,
  CircleX,
  Loader2,
  PartyPopper,
  Bot,
  Coins,
  Send,
  KeyRound,
  FlagTriangleRight,
  Hand,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── Capability icons (used by providers, dashboard, register) ── */
export const CAPABILITY_ICON_MAP: Record<string, LucideIcon> = {
  quick_scan: Search,
  deep_diagnose: Microscope,
  incident_summary: FileText,
  code_review: ShieldCheck,
  sentiment_analysis: MessageSquare,
  anomaly_detection: TrendingUp,
  human_verify: User,
  custom: Settings,
};

/* ── Dashboard event type icons ── */
export const EVENT_TYPE_ICON_MAP: Record<string, LucideIcon> = {
  route: ArrowRightLeft,
  payment: Zap,
  payout: Send,
  execution: RefreshCw,
  completion: CheckCircle,
  orchestrator: Brain,
  human_task: User,
  bounty: Tag,
  error: AlertTriangle,
  default: MapPin,
};

/* ── Provider trust-level icons ── */
export const TRUST_ICON_MAP = {
  suspended: Ban,
  slashed: Bomb,
  underReview: AlertTriangle,
  trustedStaked: ShieldCheck,
  staked: Lock,
  trusted: ShieldCheck,
  active: CircleCheck,
} as const;

/* ── Bounty type icons ── */
export const BOUNTY_TYPE_ICON_MAP: Record<string, LucideIcon> = {
  verify: CircleCheck,
  rate: Star,
  label: Tag,
  write: Pencil,
  flag: FlagTriangleRight,
  default: ClipboardList,
};

/* ── Re-exports for convenience ── */
export {
  Zap,
  Star,
  Banknote,
  RefreshCw,
  CheckCircle,
  Brain,
  User,
  Tag,
  Ban,
  Bomb,
  AlertTriangle,
  Lock,
  BarChart3,
  ClipboardList,
  MapPin,
  ArrowRightLeft,
  Hash,
  Flag,
  Pencil,
  Clock,
  CircleCheck,
  CircleX,
  Loader2,
  PartyPopper,
  Bot,
  Coins,
  Send,
  KeyRound,
  Search,
  Microscope,
  FileText,
  ShieldCheck,
  MessageSquare,
  TrendingUp,
  Settings,
  FlagTriangleRight,
  Hand,
};
export type { LucideIcon };
