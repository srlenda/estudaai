import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireUserId } from "@/lib/auth";

function getClient() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url) throw new Error("DATABASE_URL não definida");
  return createClient(authToken ? { url, authToken } : { url });
}

function mapSubject(row: {
  id: string;
  name: string;
  code: string | null;
  color: string;
  professor: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    color: row.color,
    professor: row.professor,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

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
      sql: 'SELECT id, name, code, color, professor, description, "createdAt", "updatedAt" FROM "Subject" WHERE id = ? AND "userId" = ?',
      args: [id, userId],
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Não encontrado" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, code, color, professor, description } = body;

    const sets: string[] = [];
    const args: unknown[] = [];
    if (name !== undefined) {
      sets.push("name = ?");
      args.push(name);
    }
    if (code !== undefined) {
      sets.push("code = ?");
      args.push(code);
    }
    if (color !== undefined) {
      sets.push("color = ?");
      args.push(color);
    }
    if (professor !== undefined) {
      sets.push("professor = ?");
      args.push(professor);
    }
    if (description !== undefined) {
      sets.push("description = ?");
      args.push(description);
    }
    sets.push('"updatedAt" = ?');
    args.push(new Date().toISOString());
    args.push(id);

    await client.execute({
      sql: `UPDATE "Subject" SET ${sets.join(", ")} WHERE id = ?`,
      args,
    });

    const updatedRes = await client.execute({
      sql: 'SELECT id, name, code, color, professor, description, "createdAt", "updatedAt" FROM "Subject" WHERE id = ?',
      args: [id],
    });

    const row = updatedRes.rows[0] as {
      id: string;
      name: string;
      code: string | null;
      color: string;
      professor: string | null;
      description: string | null;
      createdAt: string;
      updatedAt: string;
    };

    return NextResponse.json(mapSubject(row));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao atualizar disciplina: ${msg}` },
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
      sql: 'SELECT id FROM "Subject" WHERE id = ? AND "userId" = ?',
      args: [id, userId],
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Não encontrado" },
        { status: 404 }
      );
    }

    await client.execute({
      sql: 'DELETE FROM "Subject" WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao excluir disciplina: ${msg}` },
      { status: 500 }
    );
  }
}
