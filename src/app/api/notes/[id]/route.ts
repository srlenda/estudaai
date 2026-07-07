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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const client = getClient();

    const existingRes = await client.execute({
      sql: 'SELECT id FROM "Note" WHERE id = ? AND "userId" = ?',
      args: [id, userId],
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Não encontrado" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { title, content, subjectId, pinned } = body;

    const sets: string[] = [];
    const args: unknown[] = [];
    if (title !== undefined) {
      sets.push("title = ?");
      args.push(title);
    }
    if (content !== undefined) {
      sets.push("content = ?");
      args.push(content);
    }
    if (subjectId !== undefined) {
      sets.push('"subjectId" = ?');
      args.push(subjectId || null);
    }
    if (pinned !== undefined) {
      sets.push("pinned = ?");
      args.push(pinned ? 1 : 0);
    }
    sets.push('"updatedAt" = ?');
    args.push(new Date().toISOString());
    args.push(id);

    await client.execute({
      sql: `UPDATE "Note" SET ${sets.join(", ")} WHERE id = ?`,
      args,
    });

    const res = await client.execute({
      sql: `SELECT ${NOTE_SELECT} FROM "Note" n LEFT JOIN "Subject" s ON n."subjectId" = s.id WHERE n.id = ?`,
      args: [id],
    });

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Nota atualizada mas não encontrada" },
        { status: 500 }
      );
    }

    return NextResponse.json(mapNote(res.rows[0] as NoteRow));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao atualizar nota: ${msg}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const client = getClient();

    const existingRes = await client.execute({
      sql: 'SELECT id FROM "Note" WHERE id = ? AND "userId" = ?',
      args: [id, userId],
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Não encontrado" },
        { status: 404 }
      );
    }

    await client.execute({
      sql: 'DELETE FROM "Note" WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao excluir nota: ${msg}` },
      { status: 500 }
    );
  }
}
