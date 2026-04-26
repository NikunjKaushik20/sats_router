export interface RouteRequest {
  buyerId: string;
  capability: "quick_scan" | "deep_diagnose" | "incident_summary" | "human_verify";
  input: Record<string, unknown>;
}

export interface RouteResponse {
  jobId: string;
  provider: {
    name: string;
    priceSats: number;
    reputationScore: number;
  };
  invoice?: {
    paymentRequest: string;
    invoiceId: string;
    expiresAt: string;
  };
  budgetRemaining: number;
  status: "awaiting_payment" | "paid" | "running" | "completed";
  result?: unknown;
}

export interface JobResultResponse {
  jobId: string;
  status: string;
  result?: unknown;
  priceSats: number;
  completedAt?: string;
}

export interface ProviderProfile {
  id: string;
  name: string;
  description: string;
  capability: string;
  priceSats: number;
  reputationScore: number;
  totalJobs: number;
  isActive: boolean;
}

export interface QuickScanInput {
  logs: string[];
}

export interface DeepDiagnoseInput {
  logs: string[];
  context?: string;
}

export interface IncidentSummaryInput {
  diagnosis: {
    root_cause: string;
    evidence: string[];
    recommended_fix: string;
    confidence: number;
  };
}

export interface QuickScanResult {
  likelyCause: string;
  patterns: string[];
  confidence: "low" | "medium" | "high";
}

export interface DeepDiagnosis {
  root_cause: string;
  evidence: string[];
  recommended_fix: string;
  confidence: number;
}

export interface OrchestrationStep {
  capability: string;
  reason: string;
  condition?: string;
}

export interface OrchestrationPlan {
  steps: OrchestrationStep[];
  reasoning: string;
}

export interface DashboardData {
  providers: ProviderProfile[];
  recentEvents: Array<{
    id: string;
    type: string;
    message: string;
    data: Record<string, unknown>;
    createdAt: string;
  }>;
  stats: {
    totalJobs: number;
    totalSatsEarned: number;
    totalSatsMoved: number;
    activeProviders: number;
  };
  recentJobs: Array<{
    id: string;
    capability: string;
    status: string;
    priceSats: number;
    providerName: string;
    createdAt: string;
  }>;
}
