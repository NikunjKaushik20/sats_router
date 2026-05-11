-- CreateTable
CREATE TABLE "EconomicEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "jobId" TEXT,
    "eventType" TEXT NOT NULL,
    "amountSats" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EconomicEvent_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScoreHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "traceScore" REAL NOT NULL,
    "riskTier" TEXT NOT NULL,
    "defaultProbability" REAL NOT NULL,
    "completionRate" REAL NOT NULL,
    "repaymentRate" REAL NOT NULL,
    "networkTrust" REAL NOT NULL,
    "sybilRisk" REAL NOT NULL,
    "triggerEvent" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoreHistory_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrustEdge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceProviderId" TEXT NOT NULL,
    "targetProviderId" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "successfulCoJobs" INTEGER NOT NULL DEFAULT 0,
    "economicVolume" INTEGER NOT NULL DEFAULT 0,
    "escrowReliability" REAL NOT NULL DEFAULT 1.0,
    "lastInteraction" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrustEdge_sourceProviderId_fkey" FOREIGN KEY ("sourceProviderId") REFERENCES "Provider" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TrustEdge_targetProviderId_fkey" FOREIGN KEY ("targetProviderId") REFERENCES "Provider" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoutingDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT,
    "capability" TEXT NOT NULL,
    "selectedProviderId" TEXT NOT NULL,
    "utilityScore" REAL NOT NULL DEFAULT 0.0,
    "candidateScores" TEXT NOT NULL DEFAULT '[]',
    "routingPolicy" TEXT NOT NULL DEFAULT 'TRACE',
    "experimentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoutingDecision_selectedProviderId_fkey" FOREIGN KEY ("selectedProviderId") REFERENCES "Provider" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Provider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "priceSats" INTEGER NOT NULL,
    "reputationScore" REAL NOT NULL DEFAULT 3.0,
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "flagCount" INTEGER NOT NULL DEFAULT 0,
    "walletId" TEXT NOT NULL DEFAULT '',
    "payoutLightningAddress" TEXT NOT NULL DEFAULT '',
    "totalEarnedSats" INTEGER NOT NULL DEFAULT 0,
    "endpointUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stakeSats" INTEGER NOT NULL DEFAULT 0,
    "stakeStatus" TEXT NOT NULL DEFAULT 'none',
    "stakePaymentHash" TEXT NOT NULL DEFAULT '',
    "bidMultiplier" REAL NOT NULL DEFAULT 1.0,
    "traceScore" REAL NOT NULL DEFAULT 500.0,
    "riskTier" TEXT NOT NULL DEFAULT 'B',
    "defaultProbability" REAL NOT NULL DEFAULT 0.05,
    "completionRate" REAL NOT NULL DEFAULT 1.0,
    "repaymentRate" REAL NOT NULL DEFAULT 1.0,
    "successfulEscrowRate" REAL NOT NULL DEFAULT 1.0,
    "disputeRate" REAL NOT NULL DEFAULT 0.0,
    "networkTrust" REAL NOT NULL DEFAULT 0.0,
    "sybilRisk" REAL NOT NULL DEFAULT 0.0,
    "stakeRatio" REAL NOT NULL DEFAULT 0.0,
    "scoreVolatility" REAL NOT NULL DEFAULT 0.0,
    "totalEconomicVolume" INTEGER NOT NULL DEFAULT 0,
    "successfulJobs" INTEGER NOT NULL DEFAULT 0,
    "failedJobs" INTEGER NOT NULL DEFAULT 0,
    "defaultedJobs" INTEGER NOT NULL DEFAULT 0,
    "disputedJobs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Provider" ("bidMultiplier", "capability", "createdAt", "description", "endpointUrl", "flagCount", "id", "isActive", "name", "payoutLightningAddress", "priceSats", "reputationScore", "stakePaymentHash", "stakeSats", "stakeStatus", "totalEarnedSats", "totalJobs", "walletId") SELECT "bidMultiplier", "capability", "createdAt", "description", "endpointUrl", "flagCount", "id", "isActive", "name", "payoutLightningAddress", "priceSats", "reputationScore", "stakePaymentHash", "stakeSats", "stakeStatus", "totalEarnedSats", "totalJobs", "walletId" FROM "Provider";
DROP TABLE "Provider";
ALTER TABLE "new_Provider" RENAME TO "Provider";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EconomicEvent_providerId_createdAt_idx" ON "EconomicEvent"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "EconomicEvent_eventType_createdAt_idx" ON "EconomicEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "ScoreHistory_providerId_createdAt_idx" ON "ScoreHistory"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "TrustEdge_sourceProviderId_idx" ON "TrustEdge"("sourceProviderId");

-- CreateIndex
CREATE INDEX "TrustEdge_targetProviderId_idx" ON "TrustEdge"("targetProviderId");

-- CreateIndex
CREATE UNIQUE INDEX "TrustEdge_sourceProviderId_targetProviderId_key" ON "TrustEdge"("sourceProviderId", "targetProviderId");

-- CreateIndex
CREATE INDEX "RoutingDecision_capability_createdAt_idx" ON "RoutingDecision"("capability", "createdAt");

-- CreateIndex
CREATE INDEX "RoutingDecision_routingPolicy_createdAt_idx" ON "RoutingDecision"("routingPolicy", "createdAt");
