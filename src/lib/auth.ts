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
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
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

        return { id: row.id, email: row.email, name: row.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = (user as { id: string }).id;
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
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
