# Guia de Deploy — EstudaAí na Vercel + Turso

Este guia leva o app do desenvolvimento local para uma URL pública em ~20 minutos.
O custo total é **R$ 0** (todos os serviços têm plano grátis suficiente).

---

## Por que Turso?

O app usa Prisma + SQLite. Em desenvolvimento local, o SQLite é um arquivo
(`db/custom.db`) — perfeito. Mas na **Vercel** o sistema de arquivos é efêmero
(cada função serverless começa "zerada"), então um arquivo SQLite não persiste.

O **[Turso](https://turso.tech)** é SQLite sobre HTTP (libSQL): o mesmo modelo de
dados, mas acessível pela rede. O Prisma se conecta via adapter libSQL e os dados
persistem em produção. Plano grátis: 9 GB, 1 bilhão de leituras/mês.

---

## Passo 1 — Subir o código para o GitHub

1. Crie uma conta em [github.com](https://github.com) (se não tiver).
2. Crie um **novo repositório** (ex: `estudaai`). **Não** inicialize com README
   (o projeto já tem um).
3. No terminal, na pasta do projeto:

```bash
git add -A
git commit -m "EstudaAí pronto para deploy"
git remote add origin https://github.com/SEU_USUARIO/estudaai.git
git branch -M main
git push -u origin main
```

> Se ainda não configurou git: `git config --global user.name "Seu Nome"` e
> `git config --global user.email "seu@email.com"`.

---

## Passo 2 — Criar o banco no Turso

1. Acesse [turso.tech](https://turso.tech) e crie uma conta (login com GitHub).
2. Instale a CLI do Turso no terminal:

   ```bash
   # macOS / Linux
   curl -sSfL https://get.tur.so/install.sh | bash

   # Windows (PowerShell)
   irm https://get.tur.so/install.ps1 | iex
   ```

3. Autentique e crie o banco:

   ```bash
   turso auth login
   turso db create estudaai --location sfo1
   ```

4. **Aplique o schema** no banco Turso. O projeto tem um script pronto:

   ```bash
   # na pasta do projeto, com DATABASE_URL apontando para o Turso:
   export DATABASE_URL=$(turso db show estudaai --url)
   bun run db:push
   ```

   Isso cria todas as tabelas (Subject, Task, Link, CloudConnection, StudySession,
   Note) no Turso.

5. **Pegue as credenciais** (vai usar na Vercel):

   ```bash
   turso db show estudaai --url          # → libsql://estudaai-SEU_USER.turso.io
   turso db tokens create estudaai       # → um token longo (authToken)
   ```

   Anote os dois valores.

> 💡 Opcional: popular o banco Turso com dados de exemplo.
> Após o `db:push`, com a URL do Turso ainda no env, rode:
> `curl -X POST https://SUA_URL_VERCEL/api/seed` (depois do deploy) ou use o
> botão "Criar dados de exemplo" na própria interface.

---

## Passo 3 — Deploy na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com o **mesmo GitHub**.
2. Clique em **"Add New…" → "Project"**.
3. Importe o repositório `estudaai`.
4. A Vercel detecta o Next.js automaticamente. **Não mexa** em Build/Output.
5. Abra **"Environment Variables"** e adicione:

   | Nome | Valor |
   |------|-------|
   | `DATABASE_URL` | `libsql://estudaai-SEU_USER.turso.io` |
   | `DATABASE_AUTH_TOKEN` | o token gerado no passo 2.5 |

6. Clique em **"Deploy"**. Em ~2 minutos você terá uma URL pública:
   `https://estudaai.vercel.app` (ou similar).

Pronto! 🎉 Seu app está no ar com dados persistentes.

---

## Passo 4 — Domínio personalizado (opcional)

1. Na Vercel: **Settings → Domains** → adicione `estudaai.com.br`.
2. No seu provedor de DNS, aponte um registro `CNAME` para `cname.vercel-dns.com`.
3. Aguarde a propagação (minutos a horas). A Vercel emite HTTPS automaticamente.

---

## Atualizando o app

Sempre que quiser publicar uma nova versão:

```bash
git add -A
git commit -m "descrição da mudança"
git push
```

A Vercel faz **deploy automático** a cada push na `main`. Em ~1 minuto a nova
versão está no ar.

---

## Aplicar mudanças no schema (Turso)

Se alterar `prisma/schema.prisma` (nova tabela, novo campo, etc.):

```bash
export DATABASE_URL=$(turso db show estudaai --url)
bun run db:push
git push   # dispara novo deploy da Vercel
```

> ⚠️ Faça `db:push` **antes** do deploy, para que o banco já esteja atualizado
> quando a nova versão subir.

---

## Troubleshooting

**Erro "DATABASE_URL não definida" em produção**
→ Você esqueceu de adicionar as variáveis de ambiente na Vercel (Passo 3.5).
Adicione `DATABASE_URL` e `DATABASE_AUTH_TOKEN` e faça redeploy.

**Erro de conexão com Turso**
→ Verifique se o token está correto e se a URL é `libsql://` (não `https://`).

**Build falha na Vercel**
→ Veja os logs em `Deployments → [seu deploy] → Build Logs`. O Prisma Client é
gerado automaticamente via `postinstall` (configurado no `package.json`).

**Dados não aparecem depois do deploy**
→ O banco Turso está vazio. Popule via botão "Criar dados de exemplo" na
interface ou `curl -X POST https://sua-url/api/seed`.

---

## Próximas fases

- **Fase 3 — PWA**: transformar em app instalável no celular (manifest + service
  worker). Posso configurar quando quiser.
- **Fase 4 — App nas lojas**: wrap com Capacitor para Google Play / App Store.
