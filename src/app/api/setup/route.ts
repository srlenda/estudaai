import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

/**
 * Cria todas as tabelas do banco (executar UMA VEZ após o primeiro deploy).
 *
 * IMPORTANTE: Esta rota usa o cliente libSQL DIRETAMENTE (sem Prisma) para
 * evitar problemas de cache/env-var do Prisma em ambientes serverless.
 * Assim garantimos que a conexão com o Turso funcione independentemente.
 *
 * NÃO exige autenticação (precisa rodar antes de existir qualquer usuário).
 */
export async function POST() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  // Diagnóstico: confirma se as variáveis chegaram ao runtime
  if (!url || url === "undefined" || url === "") {
    return NextResponse.json(
      {
        ok: false,
        message: "DATABASE_URL não está disponível no ambiente.",
        debug: {
          hasDatabaseUrl: !!url && url !== "undefined",
          hasAuthToken: !!authToken,
          urlPrefix: url ? url.slice(0, 15) : "(vazio)",
          hint:
            "Verifique se DATABASE_URL está definida na Vercel (Settings → Environment Variables) marcada para o ambiente 'Production', e faça um Redeploy.",
        },
      },
      { status: 500 }
    );
  }

  let client;
  try {
    client = createClient(authToken ? { url, authToken } : { url });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        message: "Não foi possível criar o cliente libSQL.",
        debug: {
          hasDatabaseUrl: true,
          hasAuthToken: !!authToken,
          urlPrefix: url.slice(0, 20),
          error: e instanceof Error ? e.message : String(e),
        },
      },
      { status: 500 }
    );
  }

  const statements = [
    `CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
    `CREATE TABLE IF NOT EXISTS "Subject" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "code" TEXT,
      "color" TEXT NOT NULL DEFAULT '#10b981',
      "professor" TEXT,
      "description" TEXT,
      "userId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Subject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "Task" (
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
      "userId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Task_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "Task_subjectId_idx" ON "Task"("subjectId")`,
    `CREATE INDEX IF NOT EXISTS "Task_date_idx" ON "Task"("date")`,
    `CREATE INDEX IF NOT EXISTS "Task_userId_idx" ON "Task"("userId")`,
    `CREATE TABLE IF NOT EXISTS "Link" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "description" TEXT,
      "category" TEXT NOT NULL DEFAULT 'geral',
      "subjectId" TEXT,
      "userId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Link_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "Link_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "Link_subjectId_idx" ON "Link"("subjectId")`,
    `CREATE INDEX IF NOT EXISTS "Link_userId_idx" ON "Link"("userId")`,
    `CREATE TABLE IF NOT EXISTS "CloudConnection" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "provider" TEXT NOT NULL,
      "accountName" TEXT NOT NULL,
      "folderName" TEXT NOT NULL,
      "folderUrl" TEXT NOT NULL,
      "accessToken" TEXT,
      "connected" BOOLEAN NOT NULL DEFAULT 1,
      "userId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "CloudConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "CloudConnection_userId_idx" ON "CloudConnection"("userId")`,
    `CREATE TABLE IF NOT EXISTS "StudySession" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "subjectId" TEXT,
      "duration" INTEGER NOT NULL,
      "date" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'pomodoro',
      "notes" TEXT,
      "userId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StudySession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "StudySession_subjectId_idx" ON "StudySession"("subjectId")`,
    `CREATE INDEX IF NOT EXISTS "StudySession_date_idx" ON "StudySession"("date")`,
    `CREATE INDEX IF NOT EXISTS "StudySession_userId_idx" ON "StudySession"("userId")`,
    `CREATE TABLE IF NOT EXISTS "Note" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "content" TEXT NOT NULL DEFAULT '',
      "subjectId" TEXT,
      "userId" TEXT,
      "pinned" BOOLEAN NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Note_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "Note_subjectId_idx" ON "Note"("subjectId")`,
    `CREATE INDEX IF NOT EXISTS "Note_userId_idx" ON "Note"("userId")`,
  ];

  const results: { ok: boolean; error?: string }[] = [];
  for (const sql of statements) {
    try {
      await client.execute(sql);
      results.push({ ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/already exists|duplicate/i.test(msg)) {
        results.push({ ok: true });
      } else {
        results.push({ ok: false, error: msg });
      }
    }
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        message: `${failed.length} comando(s) falharam`,
        debug: {
          hasDatabaseUrl: true,
          hasAuthToken: !!authToken,
          urlPrefix: url.slice(0, 20),
          firstError: failed[0]?.error,
        },
        results,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Banco configurado! ${results.length} comandos executados. Tabelas prontas (incluindo a de usuários).`,
    debug: {
      hasDatabaseUrl: true,
      hasAuthToken: !!authToken,
      urlPrefix: url.slice(0, 20),
    },
  });
}

export async function GET() {
  return POST();
}
