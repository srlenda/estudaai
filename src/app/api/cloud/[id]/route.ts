import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireUserId } from "@/lib/auth";
import type { CloudConnection } from "@/lib/types";

function getClient() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url) throw new Error("DATABASE_URL não definida");
  return createClient(authToken ? { url, authToken } : { url });
}

interface CloudRow {
  id: string;
  provider: string;
  accountName: string;
  folderName: string;
  folderUrl: string;
  accessToken: string | null;
  connected: number;
  createdAt: string;
  updatedAt: string;
}

function mapCloud(r: CloudRow): CloudConnection {
  return {
    id: r.id,
    provider: r.provider as CloudConnection["provider"],
    accountName: r.accountName,
    folderName: r.folderName,
    folderUrl: r.folderUrl,
    accessToken: r.accessToken,
    connected: r.connected === 1 || r.connected === true,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

const CLOUD_SELECT = `id, provider, "accountName", "folderName", "folderUrl", "accessToken", connected, "createdAt", "updatedAt"`;

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
      sql: 'SELECT id FROM "CloudConnection" WHERE id = ? AND "userId" = ?',
      args: [id, userId],
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Não encontrado" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { connected, folderName, folderUrl, accountName } = body;

    const sets: string[] = [];
    const args: unknown[] = [];
    if (connected !== undefined) {
      sets.push("connected = ?");
      args.push(connected ? 1 : 0);
    }
    if (folderName !== undefined) {
      sets.push('"folderName" = ?');
      args.push(folderName);
    }
    if (folderUrl !== undefined) {
      sets.push('"folderUrl" = ?');
      args.push(folderUrl);
    }
    if (accountName !== undefined) {
      sets.push('"accountName" = ?');
      args.push(accountName);
    }
    sets.push('"updatedAt" = ?');
    args.push(new Date().toISOString());
    args.push(id);

    await client.execute({
      sql: `UPDATE "CloudConnection" SET ${sets.join(", ")} WHERE id = ?`,
      args,
    });

    const res = await client.execute({
      sql: `SELECT ${CLOUD_SELECT} FROM "CloudConnection" WHERE id = ?`,
      args: [id],
    });

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Conexão atualizada mas não encontrada" },
        { status: 500 }
      );
    }

    return NextResponse.json(mapCloud(res.rows[0] as CloudRow));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao atualizar conexão: ${msg}` },
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
      sql: 'SELECT id FROM "CloudConnection" WHERE id = ? AND "userId" = ?',
      args: [id, userId],
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Não encontrado" },
        { status: 404 }
      );
    }

    await client.execute({
      sql: 'DELETE FROM "CloudConnection" WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao desconectar: ${msg}` },
      { status: 500 }
    );
  }
}
