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

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const category = searchParams.get("category");

    const where: string[] = ['l."userId" = ?'];
    const args: unknown[] = [userId];
    if (subjectId) {
      where.push('l."subjectId" = ?');
      args.push(subjectId);
    }
    if (category) {
      where.push("l.category = ?");
      args.push(category);
    }

    const client = getClient();
    const res = await client.execute({
      sql: `SELECT ${LINK_SELECT} FROM "Link" l LEFT JOIN "Subject" s ON l."subjectId" = s.id WHERE ${where.join(" AND ")} ORDER BY l."createdAt" DESC`,
      args,
    });

    const links = (res.rows as LinkRow[]).map(mapLink);
    return NextResponse.json(links);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao listar links: ${msg}` },
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
    const { title, url, description, category, subjectId } = body;
    if (!title || !url) {
      return NextResponse.json(
        { error: "Título e URL são obrigatórios" },
        { status: 400 }
      );
    }

    const client = getClient();
    const id = genId("link");
    const now = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO "Link" (id, title, url, description, category, "subjectId", "userId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        title,
        url,
        description || null,
        category || "geral",
        subjectId || null,
        userId,
        now,
        now,
      ],
    });

    const res = await client.execute({
      sql: `SELECT ${LINK_SELECT} FROM "Link" l LEFT JOIN "Subject" s ON l."subjectId" = s.id WHERE l.id = ?`,
      args: [id],
    });

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Link criado mas não encontrado" },
        { status: 500 }
      );
    }

    return NextResponse.json(mapLink(res.rows[0] as LinkRow), { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao salvar link: ${msg}` },
      { status: 500 }
    );
  }
}
