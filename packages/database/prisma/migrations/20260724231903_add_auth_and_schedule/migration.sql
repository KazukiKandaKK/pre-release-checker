-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baseUrl" TEXT NOT NULL,
    "allowedOrigins" TEXT NOT NULL,
    "maxDepth" INTEGER NOT NULL DEFAULT 2,
    "concurrency" INTEGER NOT NULL DEFAULT 2,
    "delayMs" INTEGER NOT NULL DEFAULT 500,
    "maxPages" INTEGER NOT NULL DEFAULT 50,
    "excludePatterns" TEXT NOT NULL DEFAULT '',
    "authType" TEXT NOT NULL DEFAULT 'none',
    "authLoginUrl" TEXT,
    "authUsername" TEXT,
    "authPassword" TEXT,
    "authCookie" TEXT,
    "authToken" TEXT,
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleCron" TEXT NOT NULL DEFAULT '0 9 * * *',
    "scheduleJobType" TEXT NOT NULL DEFAULT 'crawl',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Config" ("allowedOrigins", "baseUrl", "concurrency", "createdAt", "delayMs", "excludePatterns", "id", "maxDepth", "maxPages", "updatedAt") SELECT "allowedOrigins", "baseUrl", "concurrency", "createdAt", "delayMs", "excludePatterns", "id", "maxDepth", "maxPages", "updatedAt" FROM "Config";
DROP TABLE "Config";
ALTER TABLE "new_Config" RENAME TO "Config";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
