import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireUserId } from "@/lib/auth";
import type { StudySession, Subject } from "@/lib/types";

function getClient() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url) throw new Error("DATABASE_URL não definida");
  return createClient(authToken ? { url, authToken } : { url });
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

interface SessionRow {
  id: string;
  subjectId: string | null;
  duration: number;
  date: string;
  type: string;
  notes: string | null;
  createdAt: string;
  subject_id: string | null;
  subject_name: string | null;
  subject_code: string | null;
  subject_color: string | null;
  subject_professor: string | null;
  subject_description: string | null;
  subject_createdAt: string | null;
  subject_updatedAt: string | null;
}

function mapSession(r: SessionRow): StudySession {
  const subject: Subject | null =
    r.subject_id && r.subject_name && r.subject_color
      ? {
          id: r.subject_id,
          name: r.subject_name,
          code: r.subject_code,
          color: r.subject_color,
          professor: r.subject_professor,
          description: r.subject_description,
          createdAt: r.subject_createdAt as string,
          updatedAt: r.subject_updatedAt as string,
        }
      : null;

  return {
    id: r.id,
    subjectId: r.subjectId,
    subject,
    duration: Number(r.duration),
    date: r.date,
    type: r.type as StudySession["type"],
    notes: r.notes,
    createdAt: r.createdAt,
  };
}

const SESSION_SELECT = `ss.id, ss."subjectId", ss.duration, ss.date, ss.type, ss.notes, ss."createdAt",
  s.id AS subject_id, s.name AS subject_name, s.code AS subject_code, s.color AS subject_color, s.professor AS subject_professor, s.description AS subject_description, s."createdAt" AS subject_createdAt, s."updatedAt" AS subject_updatedAt`;

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: string[] = ['ss."userId" = ?'];
    const args: unknown[] = [userId];
    if (subjectId) {
      where.push('ss."subjectId" = ?');
      args.push(subjectId);
    }
    if (from) {
      where.push("ss.date >= ?");
      args.push(from);
    }
    if (to) {
      where.push("ss.date <= ?");
      args.push(to);
    }

    const client = getClient();
    const res = await client.execute({
      sql: `SELECT ${SESSION_SELECT} FROM "StudySession" ss LEFT JOIN "Subject" s ON ss."subjectId" = s.id WHERE ${where.join(" AND ")} ORDER BY ss."createdAt" DESC`,
      args,
    });

    const sessions = (res.rows as SessionRow[]).map(mapSession);
    return NextResponse.json(sessions);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao listar sessões: ${msg}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { subjectId, duration, date, type, notes } = body;
    if (!duration || !date) {
      return NextResponse.json(
        { error: "Duração e data são obrigatórias" },
        { status: 400 }
      );
    }

    const client = getClient();
    const id = genId("session");
    const now = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO "StudySession" (id, "subjectId", duration, date, type, notes, "userId", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        subjectId || null,
        Number(duration),
        date,
        type || "manual",
        notes || null,
        userId,
        now,
      ],
    });

    const res = await client.execute({
      sql: `SELECT ${SESSION_SELECT} FROM "StudySession" ss LEFT JOIN "Subject" s ON ss."subjectId" = s.id WHERE ss.id = ?`,
      args: [id],
    });

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Sessão criada mas não encontrada" },
        { status: 500 }
      );
    }

    return NextResponse.json(mapSession(res.rows[0] as SessionRow), { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao registrar sessão: ${msg}` },
      { status: 500 }
    );
  }
}
