import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@libsql/client";

/**
 * Registro de novo usuário.
 * POST /api/auth/register
 * body: { name, email, password }
 *
 * Usa libSQL DIRETAMENTE (sem Prisma) para máxima compatibilidade com
 * o ambiente serverless da Vercel — mesmo approach que /api/setup.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, e-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "E-mail inválido." },
        { status: 400 }
      );
    }

    const url = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    if (!url) {
      return NextResponse.json(
        { error: "Banco de dados não configurado (DATABASE_URL ausente)." },
        { status: 500 }
      );
    }

    const client = createClient(authToken ? { url, authToken } : { url });

    // Verifica se o e-mail já existe
    const existing = await client.execute({
      sql: 'SELECT id FROM "User" WHERE email = ?',
      args: [email],
    });
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Já existe uma conta com este e-mail." },
        { status: 409 }
      );
    }

    // Cria o usuário com senha hasheada
    const passwordHash = await bcrypt.hash(password, 10);
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await client.execute({
      sql: 'INSERT INTO "User" (id, email, name, "passwordHash", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      args: [id, email, name, passwordHash],
    });

    return NextResponse.json(
      { ok: true, id, email, name },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao criar conta: ${msg}` },
      { status: 500 }
    );
  }
}
