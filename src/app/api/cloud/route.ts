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

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const client = getClient();
    const res = await client.execute({
      sql: 'SELECT id, provider, "accountName", "folderName", "folderUrl", "accessToken", connected, "createdAt", "updatedAt" FROM "CloudConnection" WHERE "userId" = ? ORDER BY "createdAt" DESC',
      args: [userId],
    });

    const connections = (res.rows as CloudRow[]).map(mapCloud);
    return NextResponse.json(connections);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao listar conexões: ${msg}` },
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
    const { provider, accountName, folderName, folderUrl } = body;
    if (!provider || !accountName || !folderName || !folderUrl) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 }
      );
    }

    // Token simulado (OAuth real exigiria configuração externa de credenciais)
    const accessToken = `sim_${provider}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    const client = getClient();
    const id = genId("cloud");
    const now = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO "CloudConnection" (id, provider, "accountName", "folderName", "folderUrl", "accessToken", connected, "userId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        provider,
        accountName,
        folderName,
        folderUrl,
        accessToken,
        1, // connected = true (SQLite stores as 0/1)
        userId,
        now,
        now,
      ],
    });

    const conn: CloudConnection = {
      id,
      provider,
      accountName,
      folderName,
      folderUrl,
      accessToken,
      connected: true,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json(conn, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao conectar nuvem: ${msg}` },
      { status: 500 }
    );
  }
}
