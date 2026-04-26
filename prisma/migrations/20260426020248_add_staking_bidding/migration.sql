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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Provider" ("capability", "createdAt", "description", "endpointUrl", "flagCount", "id", "isActive", "name", "payoutLightningAddress", "priceSats", "reputationScore", "totalEarnedSats", "totalJobs", "walletId") SELECT "capability", "createdAt", "description", "endpointUrl", "flagCount", "id", "isActive", "name", "payoutLightningAddress", "priceSats", "reputationScore", "totalEarnedSats", "totalJobs", "walletId" FROM "Provider";
DROP TABLE "Provider";
ALTER TABLE "new_Provider" RENAME TO "Provider";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
