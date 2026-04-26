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
    "escrowStatus" TEXT NOT NULL DEFAULT 'none',
    "escrowReleasedAt" DATETIME,
    "escrowRefundedAt" DATETIME,
    "result" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "Job_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("buyerId", "capability", "completedAt", "createdAt", "feeSats", "id", "input", "inputHash", "invoiceId", "invoicePayReq", "paidAt", "paymentHash", "paymentPreimage", "payoutHash", "payoutPreimage", "payoutSats", "priceSats", "providerId", "result", "status") SELECT "buyerId", "capability", "completedAt", "createdAt", "feeSats", "id", "input", "inputHash", "invoiceId", "invoicePayReq", "paidAt", "paymentHash", "paymentPreimage", "payoutHash", "payoutPreimage", "payoutSats", "priceSats", "providerId", "result", "status" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
