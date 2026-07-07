import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireUserId } from "@/lib/auth";
import type { LinkItem, Subject } from "@/lib/types";

function getClient() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url) throw new Error("DATABASE_URL não definida");
  return createClient(authToken ? { url, authToken } : { url });
}

interface LinkRow {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string;
  subjectId: string | null;
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

function mapLink(r: LinkRow): LinkItem {
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
    url: r.url,
    description: r.description,
    category: r.category as LinkItem["category"],
    subjectId: r.subjectId,
    subject,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

const LINK_SELECT = `l.id, l.title, l.url, l.description, l.category, l."subjectId", l."createdAt", l."updatedAt",
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
      sql: 'SELECT id FROM "Link" WHERE id = ? AND "userId" = ?',
      args: [id, userId],
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Não encontrado" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { title, url, description, category, subjectId } = body;

    const sets: string[] = [];
    const args: unknown[] = [];
    if (title !== undefined) {
      sets.push("title = ?");
      args.push(title);
    }
    if (url !== undefined) {
      sets.push("url = ?");
      args.push(url);
    }
    if (description !== undefined) {
      sets.push("description = ?");
      args.push(description);
    }
    if (category !== undefined) {
      sets.push("category = ?");
      args.push(category);
    }
    if (subjectId !== undefined) {
      sets.push('"subjectId" = ?');
      args.push(subjectId || null);
    }
    sets.push('"updatedAt" = ?');
    args.push(new Date().toISOString());
    args.push(id);

    await client.execute({
      sql: `UPDATE "Link" SET ${sets.join(", ")} WHERE id = ?`,
      args,
    });

    const res = await client.execute({
      sql: `SELECT ${LINK_SELECT} FROM "Link" l LEFT JOIN "Subject" s ON l."subjectId" = s.id WHERE l.id = ?`,
      args: [id],
    });

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Link atualizado mas não encontrado" },
        { status: 500 }
      );
    }

    return NextResponse.json(mapLink(res.rows[0] as LinkRow));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao atualizar link: ${msg}` },
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
      sql: 'SELECT id FROM "Link" WHERE id = ? AND "userId" = ?',
      args: [id, userId],
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Não encontrado" },
        { status: 404 }
      );
    }

    await client.execute({
      sql: 'DELETE FROM "Link" WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao excluir link: ${msg}` },
      { status: 500 }
    );
  }
}
