import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireUserId } from "@/lib/auth";

function getClient() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url) throw new Error("DATABASE_URL não definida");
  return createClient(authToken ? { url, authToken } : { url });
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Popula o banco com dados de demonstração (apenas se vazio para o usuário)
export async function POST() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const client = getClient();

    const countRes = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM "Subject" WHERE "userId" = ?',
      args: [userId],
    });
    const count = Number((countRes.rows[0] as { count: number }).count || 0);
    if (count > 0) {
      return NextResponse.json({ ok: true, message: "Já existem dados." });
    }

    const today = new Date();
    const fmt = (offset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return isoDate(d);
    };

    const now = new Date().toISOString();

    // Cria 4 disciplinas e captura os IDs
    const subjectsData = [
      {
        name: "Cálculo I",
        code: "MAT101",
        color: "#10b981",
        professor: "Prof. Almeida",
        description: "Limites, derivadas e integrais",
      },
      {
        name: "Programação Web",
        code: "CC205",
        color: "#f59e0b",
        professor: "Prof. Souza",
        description: "Desenvolvimento fullstack",
      },
      {
        name: "História Contemporânea",
        code: "HIS110",
        color: "#ef4444",
        professor: "Prof. Lima",
        description: "Séculos XX e XXI",
      },
      {
        name: "Biologia Celular",
        code: "BIO150",
        color: "#8b5cf6",
        professor: "Prof. Castro",
        description: "Estrutura e função celular",
      },
    ];

    const subjectIds: string[] = [];
    for (const s of subjectsData) {
      const id = genId("subject");
      subjectIds.push(id);
      await client.execute({
        sql: `INSERT INTO "Subject" (id, name, code, color, professor, description, "userId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          s.name,
          s.code,
          s.color,
          s.professor,
          s.description,
          userId,
          now,
          now,
        ],
      });
    }

    const [calcId, progId, histId, bioId] = subjectIds;

    // Tarefas de exemplo
    const tasksData = [
      { title: "Lista de exercícios - Limites", date: fmt(0), startTime: "08:00", endTime: "10:00", priority: "alta", status: "pendente", type: "atividade", subjectId: calcId },
      { title: "Revisar DER e integração", date: fmt(0), startTime: "14:00", endTime: "15:30", priority: "media", status: "pendente", type: "estudo", subjectId: calcId },
      { title: "Aula ao vivo - React Hooks", date: fmt(0), startTime: "19:00", endTime: "21:00", priority: "media", status: "pendente", type: "aula", subjectId: progId },
      { title: "Entregar trabalho final", date: fmt(2), startTime: "23:59", endTime: "23:59", priority: "alta", status: "pendente", type: "trabalho", subjectId: progId },
      { title: "Prova P1 - Cálculo", date: fmt(5), startTime: "10:00", endTime: "12:00", priority: "alta", status: "pendente", type: "prova", subjectId: calcId },
      { title: "Leitura: capítulo 4", date: fmt(1), startTime: "20:00", endTime: "21:00", priority: "baixa", status: "pendente", type: "leitura", subjectId: histId },
      { title: "Resolver quizzes da semana", date: fmt(-1), startTime: "16:00", endTime: "17:00", priority: "media", status: "concluida", type: "atividade", subjectId: bioId },
      { title: "Estudo em grupo", date: fmt(3), startTime: "18:00", endTime: "20:00", priority: "media", status: "pendente", type: "estudo", subjectId: bioId },
    ];

    for (const t of tasksData) {
      const id = genId("task");
      const tNow = new Date().toISOString();
      await client.execute({
        sql: `INSERT INTO "Task" (id, title, description, date, "startTime", "endTime", priority, status, type, "subjectId", "userId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          t.title,
          null,
          t.date,
          t.startTime,
          t.endTime,
          t.priority,
          t.status,
          t.type,
          t.subjectId,
          userId,
          tNow,
          tNow,
        ],
      });
    }

    // Links de exemplo
    const linksData = [
      { title: "Khan Academy - Cálculo", url: "https://pt.khanacademy.org/math/calculus-1", category: "aula", subjectId: calcId, description: "Videoaulas e exercícios" },
      { title: "Documentação React", url: "https://react.dev", category: "ferramenta", subjectId: progId, description: "Docs oficiais" },
      { title: "MDN Web Docs", url: "https://developer.mozilla.org", category: "ferramenta", subjectId: progId, description: null },
      { title: "Artigo: Revolução Industrial", url: "https://example.com/artigo", category: "artigo", subjectId: histId, description: null },
      { title: "Livro: Biologia Celular - Alberts", url: "https://example.com/alberts", category: "livro", subjectId: bioId, description: null },
    ];

    for (const l of linksData) {
      const id = genId("link");
      const lNow = new Date().toISOString();
      await client.execute({
        sql: `INSERT INTO "Link" (id, title, url, description, category, "subjectId", "userId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          l.title,
          l.url,
          l.description,
          l.category,
          l.subjectId,
          userId,
          lNow,
          lNow,
        ],
      });
    }

    // Notas de exemplo
    const notesData = [
      { title: "Resumo: Regra da Cadeia", content: "A regra da cadeia diz que (f(g(x)))' = f'(g(x)) · g'(x)...", subjectId: calcId, pinned: true },
      { title: "Atalhos do VS Code", content: "Ctrl+P: abrir arquivo\nCtrl+Shift+P: paleta de comandos\nAlt+Seta: mover linha", subjectId: progId, pinned: false },
      { title: "Linha do tempo - Guerra Fria", content: "1947: Doutrina Truman\n1961: Muro de Berlim\n1989: Queda do muro", subjectId: histId, pinned: false },
    ];

    for (const n of notesData) {
      const id = genId("note");
      const nNow = new Date().toISOString();
      await client.execute({
        sql: `INSERT INTO "Note" (id, title, content, "subjectId", pinned, "userId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          n.title,
          n.content,
          n.subjectId,
          n.pinned ? 1 : 0,
          userId,
          nNow,
          nNow,
        ],
      });
    }

    // Sessões de estudo dos últimos 6 dias
    const sessionsData = [
      { subjectId: calcId, duration: 50, date: fmt(-6), type: "pomodoro" },
      { subjectId: progId, duration: 100, date: fmt(-5), type: "pomodoro" },
      { subjectId: histId, duration: 25, date: fmt(-4), type: "manual" },
      { subjectId: calcId, duration: 75, date: fmt(-3), type: "pomodoro" },
      { subjectId: bioId, duration: 50, date: fmt(-2), type: "pomodoro" },
      { subjectId: progId, duration: 50, date: fmt(-1), type: "pomodoro" },
      { subjectId: calcId, duration: 25, date: fmt(0), type: "manual" },
    ];

    for (const s of sessionsData) {
      const id = genId("session");
      const sNow = new Date().toISOString();
      await client.execute({
        sql: `INSERT INTO "StudySession" (id, "subjectId", duration, date, type, notes, "userId", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          s.subjectId,
          s.duration,
          s.date,
          s.type,
          null,
          userId,
          sNow,
        ],
      });
    }

    // Conexão de nuvem de exemplo
    const cloudId = genId("cloud");
    await client.execute({
      sql: `INSERT INTO "CloudConnection" (id, provider, "accountName", "folderName", "folderUrl", "accessToken", connected, "userId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        cloudId,
        "google_drive",
        "estudante@gmail.com",
        "Faculdade 2026",
        "https://drive.google.com/drive/folders/exemplo",
        "sim_google_drive_seed",
        1,
        userId,
        now,
        now,
      ],
    });

    return NextResponse.json({ ok: true, message: "Dados de demonstração criados." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao popular dados: ${msg}` },
      { status: 500 }
    );
  }
}
