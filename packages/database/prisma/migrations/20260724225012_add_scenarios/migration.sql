-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'auto',
    "risk" TEXT NOT NULL DEFAULT 'safe',
    "status" TEXT NOT NULL DEFAULT 'active',
    "baseUrl" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "runId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Scenario_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScenarioRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "result" TEXT,
    "error" TEXT,
    CONSTRAINT "ScenarioRun_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Scenario_runId_idx" ON "Scenario"("runId");

-- CreateIndex
CREATE INDEX "Scenario_status_idx" ON "Scenario"("status");

-- CreateIndex
CREATE INDEX "Scenario_risk_idx" ON "Scenario"("risk");

-- CreateIndex
CREATE INDEX "ScenarioRun_scenarioId_idx" ON "ScenarioRun"("scenarioId");
