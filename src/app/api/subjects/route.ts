import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireUserId } from "@/lib/auth";

function getClient() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url) throw new Error("DATABASE_URL não definida");
  return createClient(authToken ? { url, authToken } : { url });
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const client = getClient();

    const subjectsRes = await client.execute({
      sql: 'SELECT id, name, code, color, professor, description, "createdAt", "updatedAt" FROM "Subject" WHERE "userId" = ? ORDER BY "createdAt" DESC',
      args: [userId],
    });

    const [tasksRes, linksRes, notesRes] = await Promise.all([
      client.execute({
        sql: 'SELECT "subjectId", COUNT(*) as count FROM "Task" WHERE "userId" = ? GROUP BY "subjectId"',
        args: [userId],
      }),
      client.execute({
        sql: 'SELECT "subjectId", COUNT(*) as count FROM "Link" WHERE "userId" = ? GROUP BY "subjectId"',
        args: [userId],
      }),
      client.execute({
        sql: 'SELECT "subjectId", COUNT(*) as count FROM "Note" WHERE "userId" = ? GROUP BY "subjectId"',
        args: [userId],
      }),
    ]);

    const taskCount = new Map<string, number>();
    for (const r of tasksRes.rows as { subjectId: string | null; count: number }[]) {
      if (r.subjectId) taskCount.set(r.subjectId, Number(r.count));
    }
    const linkCount = new Map<string, number>();
    for (const r of linksRes.rows as { subjectId: string | null; count: number }[]) {
      if (r.subjectId) linkCount.set(r.subjectId, Number(r.count));
    }
    const noteCount = new Map<string, number>();
    for (const r of notesRes.rows as { subjectId: string | null; count: number }[]) {
      if (r.subjectId) noteCount.set(r.subjectId, Number(r.count));
    }

    const subjects = subjectsRes.rows.map((row) => {
      const r = row as {
        id: string;
        name: string;
        code: string | null;
        color: string;
        professor: string | null;
        description: string | null;
        createdAt: string;
        updatedAt: string;
      };
      return {
        id: r.id,
        name: r.name,
        code: r.code,
        color: r.color,
        professor: r.professor,
        description: r.description,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        _count: {
          tasks: taskCount.get(r.id) ?? 0,
          links: linkCount.get(r.id) ?? 0,
          notes: noteCount.get(r.id) ?? 0,
        },
      };
    });

    return NextResponse.json(subjects);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao listar disciplinas: ${msg}` },
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
    const { name, code, color, professor, description } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    const client = getClient();
    const id = genId("subject");
    const now = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO "Subject" (id, name, code, color, professor, description, "userId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        name,
        code || null,
        color || "#10b981",
        professor || null,
        description || null,
        userId,
        now,
        now,
      ],
    });

    const subject = {
      id,
      name,
      code: code || null,
      color: color || "#10b981",
      professor: professor || null,
      description: description || null,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json(subject, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao criar disciplina: ${msg}` },
      { status: 500 }
    );
  }
}
