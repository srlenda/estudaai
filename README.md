# EstudaAí 🎓

Gerenciador de tarefas voltado ao público acadêmico e estudantes em geral.
Calendário com agenda por horários, disciplinas, biblioteca de links, integração
com Google Drive e OneDrive, timer Pomodoro, estatísticas de produtividade e
anotações.

## ✨ Funcionalidades

- **📅 Calendário** — grade mensal; clique num dia para abrir a agenda dividida
  por horas (06h–23h) e registrar atividades com horário de início/fim.
- **✅ Tarefas** — lista agrupada (Atrasadas / Hoje / Amanhã / Em breve) com
  filtros por disciplina, status, tipo e prioridade.
- **📚 Disciplinas** — cadastro de cursos com cor, código, professor e contadores.
- **🔗 Links** — biblioteca de materiais de estudo (vídeo, artigo, livro, aula,
  ferramenta) vinculada a disciplinas.
- **☁️ Nuvem** — vincule pastas do Google Drive e OneDrive para acesso rápido.
- **⏱️ Pomodoro** — timer de foco/pausa que registra sessões de estudo
  automaticamente por disciplina.
- **📊 Estatísticas** — KPIs e gráficos (estudo por dia, tarefas por tipo,
  criadas × concluídas, estudo por disciplina).
- **📝 Notas** — anotações por disciplina, com fixar e busca.

## 🛠️ Stack

- **Next.js 16** (App Router) + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** (New York)
- **Prisma ORM** + SQLite (dev local) / libSQL/Turso (produção)
- **React Query** (server state) + **Zustand** (client state)
- **Recharts** (gráficos) · **date-fns** · **Lucide icons**

## 🚀 Desenvolvimento local

```bash
bun install
cp .env.example .env          # configura DATABASE_URL local (SQLite)
bun run db:push               # cria o banco e gera o Prisma Client
bun run dev                   # http://localhost:3000
```

Na primeira visita, um banner oferece **"Criar dados de exemplo"** para você
explorar o app (4 disciplinas, tarefas, sessões de estudo, links e notas).

## ☁️ Publicar na web (Vercel + Turso)

Veja o guia completo em **[DEPLOY.md](./DEPLOY.md)**. Resumo:

1. Suba o repositório para o GitHub.
2. Crie um banco grátis no [Turso](https://turso.tech) e aplique o schema.
3. Importe o repositório na [Vercel](https://vercel.com) e adicione as variáveis
   de ambiente (`DATABASE_URL` e `DATABASE_AUTH_TOKEN`).
4. Deploy! 🚀

## 📁 Estrutura

```
prisma/schema.prisma        # models: Subject, Task, Link, CloudConnection, StudySession, Note
src/app/api/                # rotas REST (subjects, tasks, links, cloud, sessions, notes, stats, seed)
src/app/page.tsx            # roteamento de views (client-side)
src/components/views/       # 9 telas: dashboard, calendar, tasks, subjects, links, cloud, pomodoro, stats, notes
src/components/app-shell.tsx # layout + sidebar + footer sticky
src/lib/                    # types, store (Zustand), db (Prisma), api helper
```

## 📄 Licença

MIT — use livremente para fins acadêmicos.
