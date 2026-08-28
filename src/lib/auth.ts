import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { createClient } from "@libsql/client";

/**
 * Configuração do NextAuth.
 *
 * Estratégia: JWT (sem sessão no banco — ideal para serverless/Vercel).
 *
 * Providers:
 * 1. Credentials (e-mail + senha hasheada com bcryptjs) — login tradicional
 * 2. Google (OAuth) — login social com conta Google
 *
 * IMPORTANTE: usa libSQL DIRETAMENTE (sem Prisma) para máxima compatibilidade
 * com o ambiente serverless da Vercel.
 *
 * SESSÃO "MANTR CONECTADO":
 * - rememberMe = true  → sessão de 30 dias (sem checagem de inatividade)
 * - rememberMe = false → sessão de 8h, com logout por inatividade após 30 min
 */

// 30 dias em segundos
export const REMEMBER_SESSION_MAX_AGE = 30 * 24 * 60 * 60;
// 8 horas para sessão "não manter conectado"
export const TEMP_SESSION_MAX_AGE = 8 * 60 * 60;
// 30 minutos de inatividade antes do logout
export const INACTIVITY_TIMEOUT = 30 * 60;

function getClient() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url) throw new Error("DATABASE_URL não definida");
  return createClient(authToken ? { url, authToken } : { url });
}

/**
 * Busca ou cria um usuário a partir do login Google (upsert).
 * Gera um passwordHash aleatório (usuários Google nunca usam senha).
 */
async function upsertGoogleUser(profile: {
  email: string;
  name: string;
  sub?: string;
}): Promise<{ id: string; email: string; name: string } | null> {
  const client = getClient();
  const email = profile.email.trim().toLowerCase();

  // Tenta buscar usuário existente
  const existing = await client.execute({
    sql: 'SELECT id, email, name FROM "User" WHERE email = ?',
    args: [email],
  });

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as { id: string; email: string; name: string };
    return row;
  }

  // Cria novo usuário Google com passwordHash aleatório (não usável)
  const id = `google_${profile.sub || Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const randomHash = await bcrypt.hash(Math.random().toString(36) + Date.now().toString(), 10);
  const now = new Date().toISOString();

  await client.execute({
    sql: 'INSERT INTO "User" (id, email, name, "passwordHash", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, email, profile.name, randomHash, now, now],
  });

  return { id, email, name: profile.name };
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: REMEMBER_SESSION_MAX_AGE,
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
        rememberMe: { label: "Manter conectado", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const client = getClient();
        const result = await client.execute({
          sql: 'SELECT id, email, name, "passwordHash" FROM "User" WHERE email = ?',
          args: [email],
        });

        if (result.rows.length === 0) return null;
        const row = result.rows[0] as {
          id: string;
          email: string;
          name: string;
          passwordHash: string;
        };

        const valid = await bcrypt.compare(password, row.passwordHash);
        if (!valid) return null;

        const rememberMe = (credentials as { rememberMe?: string })?.rememberMe === "true";
        return {
          id: row.id,
          email: row.email,
          name: row.name,
          rememberMe,
        } as { id: string; email: string; name: string; rememberMe: boolean };
      },
    }),
    // Google OAuth — só ativa se as env vars estiverem configuradas
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Login Google: faz upsert do usuário no banco
      if (account?.provider === "google" && user.email) {
        const created = await upsertGoogleUser({
          email: user.email,
          name: user.name || user.email.split("@")[0],
          sub: account.providerAccountId,
        });
        if (!created) return false;
        // Anexa o id real do banco no user para o callback jwt usar
        (user as { id: string }).id = created.id;
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      // Login inicial: user está presente
      if (user) {
        token.id = (user as { id: string }).id;
        // Login Google sempre "remember me" (OAuth não tem checkbox)
        token.rememberMe = (user as { rememberMe?: boolean }).rememberMe ?? true;
        token.loginTime = Math.floor(Date.now() / 1000);
        token.lastActivity = Math.floor(Date.now() / 1000);
      }

      // "update" trigger: cliente chamou setSession para atualizar lastActivity
      if (trigger === "update" && token.lastActivity) {
        token.lastActivity = Math.floor(Date.now() / 1000);
      }

      // Verificação de expiração
      const now = Math.floor(Date.now() / 1000);
      const loginTime = (token.loginTime as number) || now;
      const lastActivity = (token.lastActivity as number) || now;
      const rememberMe = (token.rememberMe as boolean) ?? true;

      if (rememberMe) {
        if (now - loginTime > REMEMBER_SESSION_MAX_AGE) {
          return {} as typeof token;
        }
      } else {
        if (
          now - loginTime > TEMP_SESSION_MAX_AGE ||
          now - lastActivity > INACTIVITY_TIMEOUT
        ) {
          return {} as typeof token;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (!token.id) {
        return { ...session, user: undefined } as typeof session;
      }
      if (token?.id && session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session as typeof session & { expires?: string }).expires = new Date(
          ((token.rememberMe as boolean)
            ? (token.loginTime as number) + REMEMBER_SESSION_MAX_AGE
            : (token.loginTime as number) + TEMP_SESSION_MAX_AGE) * 1000
        ).toISOString();
      }
      (session as typeof session & { rememberMe?: boolean }).rememberMe =
        (token.rememberMe as boolean) ?? true;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};

export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Retorna o ID do usuário autenticado, ou null.
 */
export async function requireUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}
