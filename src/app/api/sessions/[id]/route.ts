import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireUserId } from "@/lib/auth";

function getClient() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url) throw new Error("DATABASE_URL não definida");
  return createClient(authToken ? { url, authToken } : { url });
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
      sql: 'SELECT id FROM "StudySession" WHERE id = ? AND "userId" = ?',
      args: [id, userId],
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Não encontrado" },
        { status: 404 }
      );
    }

    await client.execute({
      sql: 'DELETE FROM "StudySession" WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao excluir sessão: ${msg}` },
      { status: 500 }
    );
  }
}
