-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baseUrl" TEXT NOT NULL,
    "allowedOrigins" TEXT NOT NULL,
    "maxDepth" INTEGER NOT NULL DEFAULT 2,
    "concurrency" INTEGER NOT NULL DEFAULT 2,
    "delayMs" INTEGER NOT NULL DEFAULT 500,
    "maxPages" INTEGER NOT NULL DEFAULT 50,
    "excludePatterns" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "configSnapshot" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Page" (
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
    "visitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Page_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Page_runId_idx" ON "Page"("runId");
