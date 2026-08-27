import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { createClient } from "@libsql/client";

/**
 * Configuração do NextAuth.
 *
 * Estratégia: JWT (sem sessão no banco — ideal para serverless/Vercel).
 * Provider: Credentials (e-mail + senha hasheada com bcryptjs).
 *
 * IMPORTANTE: usa libSQL DIRETAMENTE (sem Prisma) para máxima compatibilidade
 * com o ambiente serverless da Vercel.
 *
 * SESSÃO "MANTR CONECTADO":
 * - rememberMe = true  → sessão de 30 dias (sem checagem de inatividade)
 * - rememberMe = false → sessão de 8h, com logout por inatividade após 30 min
 *   (controlado via lastActivity no token + callback jwt)
 */

// 30 dias em segundos
export const REMEMBER_SESSION_MAX_AGE = 30 * 24 * 60 * 60;
// 8 horas para sessão "não manter conectado"
export const TEMP_SESSION_MAX_AGE = 8 * 60 * 60;
// 30 minutos de inatividade antes do logout
export const INACTIVITY_TIMEOUT = 30 * 60;

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    // maxAge padrão alto — o controle real é feito no callback jwt
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

        const url = process.env.DATABASE_URL;
        const authToken = process.env.DATABASE_AUTH_TOKEN;
        if (!url) return null;

        const client = createClient(authToken ? { url, authToken } : { url });

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

        // rememberMe vem como string "true"/"false" do formulário
        const rememberMe = (credentials as { rememberMe?: string })?.rememberMe === "true";

        return {
          id: row.id,
          email: row.email,
          name: row.name,
          rememberMe,
        } as { id: string; email: string; name: string; rememberMe: boolean };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Login inicial: user está presente
      if (user) {
        token.id = (user as { id: string }).id;
        token.rememberMe = (user as { rememberMe?: boolean }).rememberMe ?? true;
        token.loginTime = Math.floor(Date.now() / 1000);
        token.lastActivity = Math.floor(Date.now() / 1000);
      }

      // "update" trigger: cliente chamou setSession para atualizar lastActivity
      if (trigger === "update" && token.lastActivity) {
        token.lastActivity = Math.floor(Date.now() / 1000);
      }

      // Verificação de expiração (a cada request que passa pelo jwt):
      const now = Math.floor(Date.now() / 1000);
      const loginTime = (token.loginTime as number) || now;
      const lastActivity = (token.lastActivity as number) || now;
      const rememberMe = (token.rememberMe as boolean) ?? true;

      if (rememberMe) {
        // Sessão longa: expira só após 30 dias do login
        if (now - loginTime > REMEMBER_SESSION_MAX_AGE) {
          // Token expirado — retorna objeto vazio para invalidar a sessão
          return {} as typeof token;
        }
      } else {
        // Sessão temporária: expira após 8h do login OU 30 min de inatividade
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
      // Se o token foi invalidado (objeto vazio), não há sessão
      if (!token.id) {
        return { ...session, user: undefined } as typeof session;
      }
      if (token?.id && session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session as { expires?: string }).expires = new Date(
          ((token.rememberMe as boolean)
            ? (token.loginTime as number) + REMEMBER_SESSION_MAX_AGE
            : (token.loginTime as number) + TEMP_SESSION_MAX_AGE) * 1000
        ).toISOString();
      }
      // Expõe rememberMe na session para o cliente saber o modo
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
 * Use nas API routes para verificar autenticação e isolar dados.
 */
export async function requireUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}
