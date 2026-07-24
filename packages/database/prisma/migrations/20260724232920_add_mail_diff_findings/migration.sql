-- AlterTable
ALTER TABLE "Run" ADD COLUMN "findings" TEXT;

-- AlterTable
ALTER TABLE "ScenarioRun" ADD COLUMN "findings" TEXT;

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
    "mailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mailHost" TEXT,
    "mailPort" INTEGER NOT NULL DEFAULT 587,
    "mailSecure" BOOLEAN NOT NULL DEFAULT false,
    "mailUser" TEXT,
    "mailFrom" TEXT,
    "mailTo" TEXT,
    "mailPassword" TEXT,
    "visualDiffThreshold" REAL NOT NULL DEFAULT 0.05,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Config" ("allowedOrigins", "authCookie", "authLoginUrl", "authPassword", "authToken", "authType", "authUsername", "baseUrl", "concurrency", "createdAt", "delayMs", "excludePatterns", "id", "maxDepth", "maxPages", "scheduleCron", "scheduleEnabled", "scheduleJobType", "updatedAt") SELECT "allowedOrigins", "authCookie", "authLoginUrl", "authPassword", "authToken", "authType", "authUsername", "baseUrl", "concurrency", "createdAt", "delayMs", "excludePatterns", "id", "maxDepth", "maxPages", "scheduleCron", "scheduleEnabled", "scheduleJobType", "updatedAt" FROM "Config";
DROP TABLE "Config";
ALTER TABLE "new_Config" RENAME TO "Config";
CREATE TABLE "new_Page" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "depth" INTEGER NOT NULL,
    "statusCode" INTEGER,
    "hasJsError" BOOLEAN NOT NULL DEFAULT false,
    "hasHttpError" BOOLEAN NOT NULL DEFAULT false,
    "consoleLogs" TEXT,
    "screenshotPath" TEXT,
    "diffPath" TEXT,
    "diffRatio" REAL,
    "hasVisualDiff" BOOLEAN NOT NULL DEFAULT false,
    "visitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Page_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Page" ("consoleLogs", "depth", "hasHttpError", "hasJsError", "id", "runId", "screenshotPath", "statusCode", "title", "url", "visitedAt") SELECT "consoleLogs", "depth", "hasHttpError", "hasJsError", "id", "runId", "screenshotPath", "statusCode", "title", "url", "visitedAt" FROM "Page";
DROP TABLE "Page";
ALTER TABLE "new_Page" RENAME TO "Page";
CREATE INDEX "Page_runId_idx" ON "Page"("runId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
