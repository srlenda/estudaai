-- ============================================================
-- EstudaAí — Schema do banco (Turso / libSQL / SQLite)
-- ============================================================
-- COMO USAR:
-- 1. Acesse https://turso.tech e faça login
-- 2. Clique no seu database → aba "SQL Shell" (ou "Console")
-- 3. Cole TODO este conteúdo no editor e clique em "Run"
-- 4. Pronto! As 6 tabelas estão criadas.
-- ============================================================

CREATE TABLE "Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "color" TEXT NOT NULL DEFAULT '#10b981',
    "professor" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'media',
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "type" TEXT NOT NULL DEFAULT 'atividade',
    "subjectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Link" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'geral',
    "subjectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Link_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "CloudConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "folderName" TEXT NOT NULL,
    "folderUrl" TEXT NOT NULL,
    "accessToken" TEXT,
    "connected" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectId" TEXT,
    "duration" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'pomodoro',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudySession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "subjectId" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Task_subjectId_idx" ON "Task"("subjectId");
CREATE INDEX "Task_date_idx" ON "Task"("date");
CREATE INDEX "Link_subjectId_idx" ON "Link"("subjectId");
CREATE INDEX "StudySession_subjectId_idx" ON "StudySession"("subjectId");
CREATE INDEX "StudySession_date_idx" ON "StudySession"("date");
CREATE INDEX "Note_subjectId_idx" ON "Note"("subjectId");
