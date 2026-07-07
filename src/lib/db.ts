import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL não definida nas variáveis de ambiente.')
  }

  // URLs "file:" → SQLite local (desenvolvimento): usa PrismaClient nativo,
  //   que abre o arquivo diretamente (sem adapter, máximo desempenho).
  // URLs "libsql:"/"https:" → Turso (produção na Vercel): usa o adapter
  //   libSQL para conectar via HTTP, compatível com serverless.
  if (url.startsWith('file:')) {
    return new PrismaClient({ log: ['error', 'warn'] })
  }

  const authToken = process.env.DATABASE_AUTH_TOKEN
  const libsql = createClient(authToken ? { url, authToken } : { url })
  const adapter = new PrismaLibSql(libsql)
  return new PrismaClient({ adapter, log: ['error', 'warn'] })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
