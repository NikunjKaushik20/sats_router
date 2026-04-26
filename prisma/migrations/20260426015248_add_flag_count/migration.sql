-- CreateTable
CREATE TABLE "Bounty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT '{}',
    "rewardSats" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "claimedBy" TEXT,
    "claimedAt" DATETIME,
    "submission" TEXT,
    "paymentHash" TEXT,
    "paymentPreimage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "expiresAt" DATETIME
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyerId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "input" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL,
    "invoiceId" TEXT,
    "invoicePayReq" TEXT,
    "priceSats" INTEGER NOT NULL,
    "feeSats" INTEGER NOT NULL DEFAULT 0,
    "paymentHash" TEXT,
    "paymentPreimage" TEXT,
    "payoutHash" TEXT,
    "payoutPreimage" TEXT,
    "payoutSats" INTEGER NOT NULL DEFAULT 0,
    "result" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "Job_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("buyerId", "capability", "completedAt", "createdAt", "feeSats", "id", "input", "inputHash", "invoiceId", "invoicePayReq", "paidAt", "priceSats", "providerId", "result", "status") SELECT "buyerId", "capability", "completedAt", "createdAt", "feeSats", "id", "input", "inputHash", "invoiceId", "invoicePayReq", "paidAt", "priceSats", "providerId", "result", "status" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Provider" ("capability", "createdAt", "description", "endpointUrl", "id", "isActive", "name", "priceSats", "reputationScore", "totalJobs", "walletId") SELECT "capability", "createdAt", "description", "endpointUrl", "id", "isActive", "name", "priceSats", "reputationScore", "totalJobs", "walletId" FROM "Provider";
DROP TABLE "Provider";
ALTER TABLE "new_Provider" RENAME TO "Provider";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
