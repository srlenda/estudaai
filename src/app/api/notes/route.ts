import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireUserId } from "@/lib/auth";
import type { Note, Subject } from "@/lib/types";

function getClient() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url) throw new Error("DATABASE_URL não definida");
  return createClient(authToken ? { url, authToken } : { url });
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

interface NoteRow {
  id: string;
  title: string;
  content: string;
  subjectId: string | null;
  pinned: number;
  createdAt: string;
  updatedAt: string;
  subject_id: string | null;
  subject_name: string | null;
  subject_code: string | null;
  subject_color: string | null;
  subject_professor: string | null;
  subject_description: string | null;
  subject_createdAt: string | null;
  subject_updatedAt: string | null;
}

function mapNote(r: NoteRow): Note {
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
    title: r.title,
    content: r.content,
    subjectId: r.subjectId,
    subject,
    pinned: r.pinned === 1 || r.pinned === true,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

const NOTE_SELECT = `n.id, n.title, n.content, n."subjectId", n.pinned, n."createdAt", n."updatedAt",
  s.id AS subject_id, s.name AS subject_name, s.code AS subject_code, s.color AS subject_color, s.professor AS subject_professor, s.description AS subject_description, s."createdAt" AS subject_createdAt, s."updatedAt" AS subject_updatedAt`;

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");

    const where: string[] = ['n."userId" = ?'];
    const args: unknown[] = [userId];
    if (subjectId) {
      where.push('n."subjectId" = ?');
      args.push(subjectId);
    }

    const client = getClient();
    const res = await client.execute({
      sql: `SELECT ${NOTE_SELECT} FROM "Note" n LEFT JOIN "Subject" s ON n."subjectId" = s.id WHERE ${where.join(" AND ")} ORDER BY n.pinned DESC, n."updatedAt" DESC`,
      args,
    });

    const notes = (res.rows as NoteRow[]).map(mapNote);
    return NextResponse.json(notes);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao listar notas: ${msg}` },
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
    const { title, content, subjectId, pinned } = body;
    if (!title) {
      return NextResponse.json(
        { error: "Título é obrigatório" },
        { status: 400 }
      );
    }

    const client = getClient();
    const id = genId("note");
    const now = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO "Note" (id, title, content, "subjectId", pinned, "userId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        title,
        content || "",
        subjectId || null,
        pinned ? 1 : 0,
        userId,
        now,
        now,
      ],
    });

    const res = await client.execute({
      sql: `SELECT ${NOTE_SELECT} FROM "Note" n LEFT JOIN "Subject" s ON n."subjectId" = s.id WHERE n.id = ?`,
      args: [id],
    });

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Nota criada mas não encontrada" },
        { status: 500 }
      );
    }

    return NextResponse.json(mapNote(res.rows[0] as NoteRow), { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao criar nota: ${msg}` },
      { status: 500 }
    );
  }
}
