# EstudaAí — Worklog

Projeto: Gerenciador de Tarefas Acadêmico (Next.js 16 + Prisma + SQLite + shadcn/ui).

---
Task ID: 1
Agent: main (orchestrator)
Task: Inicializar fullstack, definir schema Prisma e fazer push do banco

Work Log:
- Rodei init-fullstack.sh (dev server já ativo na porta 3000).
- Substituí `prisma/schema.prisma` pelos models: Subject, Task, Link, CloudConnection, StudySession, Note.
- Rodei `bun run db:push` com sucesso (Prisma Client gerado).

Stage Summary:
- Banco SQLite em `db/custom.db` com 6 models.
- Relações: Subject 1→N (Task, Link, Note, StudySession) com onDelete: SetNull.
- Datas armazenadas como ISO string (YYYY-MM-DD) por simplicidade com SQLite.

---
Task ID: 2
Agent: main (orchestrator)
Task: Construir fundação (tema, tipos, store, providers, layout, app-shell)

Work Log:
- Atualizei `globals.css` com tema acadêmico (primária esmeralda, destaque âmbar), light + dark, scrollbar custom, animação fade-in.
- Criei `src/lib/types.ts` com todas as interfaces (Subject, Task, Link, CloudConnection, StudySession, Note, Stats), enums de labels/cores e helpers de data.
- Criei `src/lib/store.ts` (Zustand): currentView, selectedDate, subjectFilter, sidebarOpen, refreshKey.
- Criei `src/lib/api.ts` (helper fetch).
- Criei `src/components/providers.tsx` (React Query + next-themes).
- Atualizei `src/app/layout.tsx` (metadata pt-BR, providers, Sonner toaster).
- Criei `src/components/app-shell.tsx`: sidebar fixa desktop + drawer mobile, topbar, theme toggle, footer sticky.

Stage Summary:
- App shell pronto com navegação entre 9 views.
- Footer usa `mt-auto` dentro de `min-h-screen flex flex-col` (sticky bottom).
- Cores: esmeralda (primary) + âmbar (accent). Sem indigo/azul.

---
Task ID: 3
Agent: main (orchestrator)
Task: Construir TODAS as API routes

Work Log:
- Criei `src/app/api/subjects/route.ts` (GET com _count, POST) e `subjects/[id]/route.ts` (PUT, DELETE).
- Criei `src/app/api/tasks/route.ts` (GET com filtros date/subjectId/status/from/to, POST) e `tasks/[id]/route.ts` (PUT, DELETE).
- Criei `src/app/api/links/route.ts` (GET filtros subjectId/category, POST) e `links/[id]/route.ts` (PUT, DELETE).
- Criei `src/app/api/cloud/route.ts` (GET, POST com token simulado) e `cloud/[id]/route.ts` (PUT, DELETE).
- Criei `src/app/api/sessions/route.ts` (GET filtros, POST) e `sessions/[id]/route.ts` (DELETE).
- Criei `src/app/api/notes/route.ts` (GET ordenado por pinned, POST) e `notes/[id]/route.ts` (PUT, DELETE).
- Criei `src/app/api/stats/route.ts` (GET agregando tudo: totais, tasksByType, tasksByPriority, studyBySubject, studyLast7Days, tasksLast7Days, upcomingTasks, todayTasks).
- Criei `src/app/api/seed/route.ts` (POST popula 4 disciplinas + tarefas + links + notas + sessões + 1 conexão de nuvem, só se vazio).

Stage Summary:
- Contrato de APIs estável. Todas retornam JSON. Erros via { error } com status 4xx/5xx.
- `useAppStore.bumpRefresh()` deve ser chamado após mutações para forçar re-fetch.
- Tipos em `src/lib/types.ts` são a fonte de verdade para os subagentes das views.

---
Task ID: 4
Agent: main (orchestrator)
Task: Escrever page.tsx com roteamento de views + SeedPrompt

Work Log:
- `src/app/page.tsx`: client component, mostra splash enquanto busca /api/subjects, depois renderiza AppShell com SeedPrompt + ViewRouter (switch por currentView).
- `src/components/views/seed-prompt.tsx`: banner que aparece quando não há disciplinas, chama POST /api/seed.
- Criei stubs temporários para as 9 views (dashboard, calendar, tasks, subjects, links, cloud, pomodoro, stats, notes) para o app compilar.

Stage Summary:
- App compila e roda. Stubs serão substituídos pelos subagentes nas próximas tasks.
- Padrão de cada view: `'use client'`, usa React Query (fetch via `api()` helper ou fetch direto), usa `useAppStore` para navegação/filtros, `bumpRefresh()` após mutações, `toast` do sonner para feedback.

---
Task ID: 5a
Agent: general-purpose (Tasks + Subjects views)
Task: Construir as views de Tarefas e Disciplinas com CRUD completo, filtros, agrupamento, dialogs e navegação cruzada.

Work Log:
- Li context: worklog, types.ts, store.ts, api.ts e componentes shadcn (button, card, dialog, select, badge, alert-dialog, input, textarea, label, skeleton).
- Escrevi `src/components/views/tasks-view.tsx` (TasksView): header com título + botão "Nova tarefa"; barra de filtros (busca por título/descrição + selects de disciplina/status/tipo/prioridade + toggle "Hoje"); agrupamento de tarefas por data (Atrasadas, Hoje, Amanhã, Em breve) com header sticky; cards com checkbox de conclusão, badges de tipo/prioridade, status com ícone, data em pt-BR, intervalo de horário e chip de disciplina; estados de loading (4 skeletons) e vazio (ícone + CTA); Dialog de criar/editar com validação de título+data; AlertDialog para confirmar exclusão.
- Escrevi `src/components/views/subjects-view.tsx` (SubjectsView): header + botão "Nova disciplina"; grid responsivo (1/2/3 cols) de cards com borda esquerda colorida de 4px, ícone BookOpen na cor da disciplina, badge de código, professor, descrição truncada, stats (tarefas/links/notas) e botão "Ver tarefas"; Dialog de criar/editar com swatches de cor (SUBJECT_COLORS) selecionáveis com ring + Check, validação de nome; AlertDialog para exclusão.
- Navegação cruzada: "Ver tarefas" no card de disciplina chama `setSubjectFilter(id)` + `setView("tasks")`. TasksView usa `subjectFilter` do store como filtro inicial bidirecional.
- Ambas usam React Query (queryKey inclui `refreshKey`), mutações chamam `qc.invalidateQueries` + `bumpRefresh()`, feedback via `toast` do sonner, paleta esmeralda/âmbar via tokens shadcn e color maps de types.ts, animação `animate-fade-in` no container, scroll vertical com `max-h-[calc(100vh-...)]` e `custom-scroll`.

Stage Summary:
- Arquivos produzidos: `src/components/views/tasks-view.tsx` (~660 linhas) e `src/components/views/subjects-view.tsx` (~410 linhas).
- CRUD end-to-end funcional em ambas as views; nenhum arquivo além das duas views foi modificado.
- Decisões: agrupamento por data com 4 buckets (mais legível que por status); toggle de conclusão alterna entre concluída e pendente; "Nenhuma" disciplina representada como valor `"none"` no Select; Subject estendido com `_count` via interface local `SubjectWithCount`.
- Tipos, labels e color maps consumidos exclusivamente de `src/lib/types.ts` (fonte de verdade).

---
Task ID: 5c
Agent: general-purpose (Links + Cloud views)
Task: Construir as views de Links (biblioteca de materiais) e Nuvem (hub de pastas do Google Drive / OneDrive) com React Query + Zustand + shadcn/ui.

Work Log:
- Li o worklog, types.ts, store.ts, api.ts e os componentes shadcn relevantes (button, card, dialog, select, tabs, switch, alert, alert-dialog, skeleton, input, textarea, badge, label) para alinhar tokens e padrões.
- Validei os contratos das rotas /api/links (GET com filtros subjectId/category, POST), /api/links/[id] (PUT, DELETE retornando {ok:true}), /api/cloud (GET, POST) e /api/cloud/[id] (PUT, DELETE) diretamente no código.
- Sobrescrevi `src/components/views/links-view.tsx`:
  - Header "Links" + subtítulo + botão "Adicionar link" (h-11).
  - Barra de filtros: input de busca com ícone (client-side por title/url), Select de disciplina (inicializado do `subjectFilter` do store e sincronizado de volta via `setSubjectFilter`), Tabs de categoria com scroll horizontal ("Todas" + categorias de LINK_CATEGORY_LABELS).
  - Grid responsiva (1/2/3 colunas) dentro de `max-h-[70vh] overflow-y-auto custom-scroll`.
  - Card: ícone da categoria (Link2/Video/FileText/BookOpen/GraduationCap/Wrench) em chip primary, título, URL clicável truncada (target=_blank rel=noreferrer), descrição line-clamp-2, badge de categoria, chip de disciplina com ponto colorido, botão "Abrir link" proeminente + editar + excluir (AlertDialog) com alvos de 44px.
  - Estados: skeletons (6), empty state com CTA condicional (texto muda se há filtros ativos), Dialog controlada para criar/editar com validação de URL (http/https), Select de disciplina inclui "Nenhuma".
  - Mutations com toast + invalidateQueries + bumpRefresh.
- Sobrescrevi `src/components/views/cloud-view.tsx`:
  - Header "Nuvem" + subtítulo (pt-BR, conforme especificado).
  - Dois cards de provedor (Google Drive verde #0f9d58 com HardDrive, OneDrive azul #0078d4 com Cloud) — brand colors aplicadas apenas em ícones pequenos (exceção à paleta emerald/amber).
  - Alert informativo (Info icon) explicando integração baseada em links vs OAuth completo.
  - Lista de CloudConnection[]: ícone do provedor, folderName, "Provedor · accountName", Switch para alternar `connected` via PUT (com toast de ativada/pausada), Badge de status, botão "Abrir pasta" (external link), AlertDialog para desconectar.
  - Dialog de conexão: provider (Select), accountName (email), folderName, folderUrl (validação http/https). Botão "Conectar pasta" nos cards de provedor pré-preenche o provider.
  - Estados: skeletons (3), empty state com CTA, max-h-[90vh] overflow-y-auto custom-scroll no dialog.
  - Mutations com toast + invalidateQueries + bumpRefresh.

Stage Summary:
- Arquivos modificados: `src/components/views/links-view.tsx` e `src/components/views/cloud-view.tsx` (apenas esses dois, conforme instrução).
- Padrão: `'use client'`, React Query v5 (`useQuery`/`useMutation`/`useQueryClient`, `isPending`), `api()` helper, `useAppStore` (refreshKey em queryKey + bumpRefresh após mutações + subjectFilter para filtro inicial de Links), `toast` do sonner.
- Design: primária esmeralda via tokens shadcn (nenhum indigo/azul como cor de app), brand colors só nos ícones de Google Drive/OneDrive. Mobile-first, cards p-4/p-5, gaps gap-4/gap-6, touch targets ≥ 44px (h-11 / size-11), ícones Lucide, labels pt-BR, animate-fade-in nos roots, external links com target=_blank rel=noreferrer, aria-labels em todos os botões de ícone, Dialogs controlados.
- Não rodei lint/build/dev (conforme instrução). Pronto para integração no ViewRouter existente (que já referencia `LinksView` e `CloudView`).

---
Task ID: 5d
Agent: general-purpose (Pomodoro + Stats + Notes views)
Task: Construir as 3 views Pomodoro, Estatísticas e Notas (substituindo os stubs)

Work Log:
- Li contexto: worklog, types.ts, store.ts, api.ts e os componentes shadcn (button, card, dialog, select, badge, input, textarea, progress, tabs, scroll-area, alert-dialog, skeleton, switch, label, popover, slider). Confirmei recharts 2.15.4 instalado e tema esmeralda/âmbar em globals.css.
- Validei os contratos reais das API routes (sessions, notes, stats) lendo os arquivos em /api — DELETE retorna { ok: true } (JSON válido), POST/PUT retornam o objeto com include subject.
- Sobrescrevi `src/components/views/pomodoro-view.tsx`:
  - Timer circular em SVG (raio 120, strokeDashoffset baseado em remaining/total), cor esmeralda no foco / âmbar nas pausas, com transição linear de 1s.
  - 3 modos (Foco 25 / Pausa curta 5 / Pausa longa 15) em Tabs; popover de configurações com Slider para ajustar cada duração.
  - Controles Iniciar/Pausar/Reiniciar; ao zerar, toast "Foco concluído! 🎉" + auto-POST /api/sessions (type=pomodoro, date=today, subjectId selecionado) e troca automática para pausa (longa a cada 4 ciclos).
  - Botão "Registrar parcial (N min)" quando pausado com minutos decorridos > 0.
  - Select de disciplina + Textarea de notas; painel "Sessões de hoje" com ScrollArea, chips coloridos por disciplina, AlertDialog para excluir.
  - Stats row: Minutos hoje / Sessões hoje / Minutos totais (do /api/stats).
  - useEffect com setTimeout encadeado (deps [isRunning, remaining]) + onCompleteRef para evitar stale closures; cleanup no unmount.
- Sobrescrevi `src/components/views/stats-view.tsx`:
  - Fetch /api/stats com skeleton grid durante loading.
  - 4 KPI cards (concluídas/total + %, minutos Xh Ym, disciplinas, links).
  - 4 charts Recharts em Cards: BarChart estudo 7 dias (esmeralda), PieChart donut tarefas por tipo (paleta hex própria), LineChart criadas x concluídas (esmeralda/âmbar), BarChart horizontal estudo por disciplina (cor por subject.color).
  - Empty states por chart; ResponsiveContainer height 260; grid 1 col mobile / 2 cols lg.
- Sobrescrevi `src/components/views/notes-view.tsx`:
  - Grid de notas (1/2/3 cols), fixadas primeiro com borda âmbar + ícone Pin.
  - Card: título (clique abre edit), conteúdo whitespace-pre-wrap com max-h-36 + fade "Ver mais/menos", chip de disciplina com ponto colorido, botões fixar/editar/excluir.
  - Busca por título/conteúdo + Select de filtro por disciplina; Dialog create/edit (título, Textarea grande, Select disciplina "Nenhuma", Switch fixar); AlertDialog para excluir.
  - Mutations POST/PUT/DELETE com bumpRefresh + invalidate; toasts pt-BR; empty state com CTA; skeletons durante loading.
  - Sentinela "none"/"all" nos Selects para evitar value="" no Radix SelectItem.

Stage Summary:
- 3 arquivos de view finalizados, todos "use client", usando React Query + api() + useAppStore (refreshKey/bumpRefresh/setView) + toast sonner + AlertDialog para deletes.
- Paleta respeita esmeralda primária + âmbar destaque; Recharts usa hex #10b981/#f59e0b + cores por disciplina; sem indigo/azul como primária.
- Touch targets ≥ 44px (botões h-11/size-9/lg), aria-labels em botões de ícone, role="timer"/aria-live no Pomodoro, animate-fade-in nas raízes, layout mobile-first responsivo.
- Apenas os 3 arquivos de view foram modificados; sem lint/build/servidor executados.

---
Task ID: 5b
Agent: general-purpose (Calendar view)
Task: Construir a view de Calendário — peça central do app. Um calendário mensal onde clicar no dia abre a agenda horária do dia (06:00–23:00) com blocos de tarefas posicionados por hora, lista de atividades sem horário, dialog de criar/editar atividade, e CRUD completo via API.

Work Log:
- Li worklog.md, types.ts, store.ts, api.ts e os components ui (calendar, button, dialog, card, badge, select, input, textarea, popover, checkbox, label) para alinhar com convenções e contratos.
- Confirmei o contrato das APIs /api/tasks (GET com from/to, GET com date, POST, PUT/[id], DELETE/[id]) e /api/subjects.
- Sobrescrevi `src/components/views/calendar-view.tsx` (apenas este arquivo foi modificado).
- Decidi NÃO usar o `Calendar` do shadcn (single-date-picker) — construí um month grid custom de 6 semanas (42 dias) começando no domingo da semana do dia 1, para poder renderizar dots de tarefas por dia.
- Layout: `grid lg:grid-cols-[1.2fr_1fr] gap-6` (month grid à esquerda, agenda diária à direita); empilha em mobile. Root com `animate-fade-in`.
- Left panel: navegação ← [Mês de Ano] → + botão "Hoje", header Dom..Sáb, células com número (hoje = bg-primary text-primary-foreground, selecionado = ring-primary), até 3 dots coloridos por cor da disciplina (fallback cor da prioridade) + "+N".
- Right panel: header com data formatada pt-BR ("Quarta-feira, 15 de Janeiro"), chip "Hoje" quando aplicável, contador de atividades, botão "Nova atividade". Body com `max-h-[70vh] overflow-y-auto custom-scroll`.
  - Seção "Sem horário definido" lista tarefas sem startTime como cards compactos.
  - Timeline 06:00–23:00 com 18 linhas de 60px. Coluna esquerda mostra "HH:00". Coluna direita tem slots clicáveis (abrem dialog com date+startTime pré-preenchidos) e blocos de tarefas absolutamente posicionados: `top = (startMin - 360) / 60 * 60`, `height = duracaoHoras * 60`, com clamp para [06:00, 24:00], mínimo 28px.
  - Cada bloco: borda esquerda colorida (cor da disciplina ou prioridade), fundo tinted com hexToRgba(cor, 0.1), Checkbox para marcar concluída (line-through + opacity-60), título, faixa horário, badge do tipo, botão delete (Trash2). Click no bloco abre dialog de edição.
  - Empty state amigável com ícone CalendarDays e instrução.
- Dialog compartilhado criar/editar: título (Input, obrigatório), data (Input type=date, obrigatório), startTime/endTime (Input type=time), tipo/prioridade/status (Select), disciplina (Select com opção "Nenhuma" usando valor sentinela "none"), descrição (Textarea). Validação de título+data+fim>início. On success: bumpRefresh(), toast.success, fecha dialog.
- Mutations: POST/PUT via saveMutation, DELETE via deleteMutation, PUT parcial de status via toggleStatusMutation. Todas chamam bumpRefresh() no success.
- Data fetching: React Query. Query 1 (monthTasks: `from`/`to` do mês visível) alimenta os dots. Query 2 (selectedDayTasks: `?date=`) alimenta a agenda — separada para a agenda permanecer correta quando o dia selecionado está fora do mês visível. Query 3 (subjects). Todas incluem `refreshKey` no queryKey.
- Acessibilidade: aria-labels em todos os botões de ícone e slots horários, aria-pressed nos dias, role="button"/tabIndex nos blocos, aria-hidden na coluna de labels (slots já têm aria-label com horário), suporte a teclado (Enter/Space abre edição).
- Touch targets ≥ 44px (min-h-11 nos botões principais, size-10 nos icon buttons de navegação).
- Tema: usa apenas tokens shadcn (primary esmeralda, accent âmbar) + cores das maps em types.ts. Sem indigo/azul.
- Português pt-BR em todos os labels.

Stage Summary:
- Arquivo modificado: apenas `src/components/views/calendar-view.tsx` (1086 linhas, 4 componentes: CalendarView + TaskBlock + UntimedCard + TaskDialog).
- Decisões de design:
  1. Month grid custom em vez do Calendar do shadcn para suportar dots por dia.
  2. Duas queries React Query (mês + dia) ao invés de derivar — agenda sempre consistente mesmo com selectedDate fora do viewMonth.
  3. Navegação de meses (←/→) NÃO altera selectedDate; só "Hoje" e clicks em dias mudam selectedDate. Clicar num dia de mês adjacente (overflow) também atualiza viewMonth.
  4. ROW_HEIGHT=60px, 18 linhas (06:00–23:00), blocos com clamp para [06:00, 24:00] e altura mínima 28px para garantir visibilidade.
  5. Checkbox do Radix envolto em <span onClick stopPropagation> para impedir que o click da checkbox abra o dialog de edição do bloco/card.
  6. Select de disciplina usa valor sentinela "none" (Radix não permite valor vazio em alguns cenários).
  7. Cores dos blocos: subject.color se houver, senão hex da prioridade (baixa=#10b981, media=#f59e0b, alta=#ef4444). Fundo tinted via hexToRgba.
- Não rodei lint/build/servers conforme instruções. Pronto para o orchestrador validar.

---
Task ID: 6
Agent: main (orchestrator)
Task: Construir a Dashboard (view inicial que agrega tudo)

Work Log:
- Criei `src/components/views/dashboard-view.tsx`: saudação dinâmica (Bom dia/tarde/noite) + data por extenso pt-BR.
- 4 KPIs clicáveis (Atividades hoje, Concluídas, Estudo hoje, Disciplinas) que navegam para as views correspondentes.
- Card "Atividades de hoje" com toggle de conclusão inline (PUT /api/tasks/:id).
- Card "Próximos prazos" com countdown de dias (Hoje/Amanhã/Em X dias/atrasada) e badges coloridos por urgência.
- Card "Seu progresso" com Progress bar de taxa de conclusão + mini-stats.
- Card "Minhas disciplinas" (top 5) + card "Atalhos" (grid 2x3 para todas as views).
- Consome /api/stats e /api/subjects via React Query com refreshKey.

Stage Summary:
- Dashboard é a landing view. Tudo funciona: navegação cruzada, toggle de tarefas, dados reais do /api/stats.
- Empty states amigáveis em cada seção.

---
Task ID: 7
Agent: main (orchestrator)
Task: Verificação end-to-end com Agent Browser + correções + lint

Work Log:
- Rodei lint: 6 erros iniciais (React Compiler: manual memoization no calendar-view, ref-atualizado-durante-render no pomodoro, setState-in-effect no pomodoro).
- Corrigi calendar-view.tsx: removi useCallback/useMemo manuais (React Compiler cuida da memoização) → openCreate, openEdit e `blocks` agora são funções/valores derivados.
- Corregi pomodoro-view.tsx: movi `onCompleteRef.current = ...` para dentro de useEffect; substituí auto-select de disciplina por derivação `effectiveSubjectId` (sem setState em effect); movi setIsRunning(false) do effect de countdown para o handler de conclusão.
- Adicionei `min-h-0` ao <nav> do sidebar para garantir scroll correto e evitar sobreposição do último item pelo card de dica.
- Reduzi log do Prisma de ['query'] para ['error','warn'] (dev.log menos verboso).
- Populei dados demo via POST /api/seed (4 disciplinas, 8 tarefas, 5 links, 3 notas, 7 sessões, 1 conexão de nuvem).

Verificação com Agent Browser (tudo confirmado):
- Dashboard renderiza com KPIs, atividades de hoje, prazos, disciplinas, atalhos.
- Calendário: grid mensal com contagem de tarefas por dia; clique no dia abre agenda por horários (06:00-23:00) com blocos posicionados; criação de tarefa via clique no slot funciona (diálogo pré-preenche data+horário).
- Tarefas: agrupamento Atrasadas/Hoje/Amanhã/Em breve, filtros, CRUD funcional.
- Disciplinas, Links, Notas: CRUD completo.
- Nuvem: Google Drive + OneDrive, alerta explicativo sobre OAuth, conexões com switch toggle e link externo.
- Pomodoro: timer conta regressivo (25:00→24:57 em 3s), tabs Foco/Pausa, controles Iniciar/Reiniciar.
- Estatísticas: 4 KPIs + 4 gráficos Recharts (bar, donut, line, horizontal bar) renderizam.
- Mobile (390x844): topbar com hamburger, drawer abre e fecha ao navegar.
- Footer sticky (mt-auto + min-h-screen flex-col): empurra naturalmente em conteúdo longo.
- Sem erros de console ou runtime em todo o fluxo. Lint final limpo (0 erros).

Stage Summary:
- App completo e funcional, verificado end-to-end no browser.
- 9 views + 8 endpoints API + 6 models Prisma, tudo integrado.
- Tema esmeralda/âmbar, responsivo, dark mode, acessível (aria-labels, semantic HTML, touch targets ≥44px).

---
Task ID: P1
Agent: main (orchestrator)
Task: Fase 1 — preparar deploy Vercel + Turso (DB serverless-ready)

Work Log:
- Instalados @prisma/adapter-libsql + @libsql/client (SQLite sobre HTTP, funciona em serverless).
- Rewrote src/lib/db.ts: branch por scheme — `file:` URLs usam PrismaClient nativo (dev local, sem adapter, máx desempenho); `libsql:`/`https:` URLs usam PrismaClient + adapter PrismaLibSql (produção Vercel/Turso). Suporta DATABASE_AUTH_TOKEN opcional.
- Tentei provider="libsql" no schema — Prisma CLI 6.19 não reconhece; mantido provider="sqlite" (o adapter é runtime-only, não afeta o CLI). `bun run db:push` continua funcionando localmente com file: URL.
- Corrigido nome do export: PrismaLibSql (não PrismaLibSQL) — adapter-libsql@7.8.0.
- Adicionado `"postinstall": "prisma generate"` no package.json — necessário para o build da Vercel gerar o Prisma Client.
- Criado vercel.json (framework nextjs, região sfo1).
- Criado .env.example documentando DATABASE_URL (file: dev / libsql: prod) e DATABASE_AUTH_TOKEN.
- .gitignore: adicionada exceção `!.env.example` (doc, não segredo) e ignorado `.zscripts/dev.pid`.
- Criado README.md (visão geral, stack, estrutura, dev local) e DEPLOY.md (guia passo a passo GitHub → Turso → Vercel, com troubleshooting).
- Commit: c9d2806 "deploy: prepara Fase 1 (Vercel + Turso)".

Stage Summary:
- Dev local: inalterado, SQLite file: via PrismaClient nativo. App verificado no browser (dashboard com dados, 0 erros).
- Produção: pronto para Vercel. DB via Turso libSQL (adapter). Variáveis a configurar na Vercel: DATABASE_URL + DATABASE_AUTH_TOKEN.
- Lint: 0 erros. Dev server: 200 OK.
- Artefatos para o usuário: README.md, DEPLOY.md, .env.example, vercel.json.
- Próximos passos do usuário: criar conta Turso, aplicar schema (`DATABASE_URL=$(turso db show estudaai --url) bun run db:push`), push GitHub, import na Vercel com env vars.

---
Task ID: P1-GUIA
Agent: main (orchestrator)
Task: Criar guia para iniciantes (GitHub/Turso/Vercel do zero) e empacotar projeto para download

Work Log:
- Gerado `turso-schema.sql` (DDL SQLite/libSQL pronto para colar no SQL Shell do Turso — 6 tabelas + índices). Elimina a necessidade de instalar Bun/Node localmente para aplicar o schema.
- Criado `GUIA-INICIANTE.md`: guia passo a passo para quem nunca usou GitHub/Turso/Vercel, em 4 etapas (~30 min, R$ 0), com cada clique e cada campo descritos. Inclui: baixar zip, GitHub Desktop (sem linha de comando), Turso via web console, Vercel via web. Seção de troubleshooting + resumo das contas.
- Empacotado projeto em `download/estudaai.zip` (132 arquivos, 262 KB, sem node_modules/.next/.git/db).
- Copiados `GUIA-INICIANTE.md` e `turso-schema.sql` diretamente para a pasta `download/` (acesso individual além do zip).

Stage Summary:
- Usuário não precisa instalar NENHUMA ferramenta de linha de comando — só GitHub Desktop (GUI) + navegadores.
- Fluxo: baixar zip → GitHub Desktop envia pro GitHub → Turso web console cria DB + cola SQL → Vercel importa do GitHub com 2 env vars → deploy.
- Artefatos na pasta download/: estudaai.zip, GUIA-INICIANTE.md, turso-schema.sql, README.md.

---
Task ID: R3
Agent: general-purpose (re-add auth to API routes)
Task: Re-adicionar autenticação + isolamento de dados por usuário em TODAS as 14 API routes existentes (subjects, tasks, links, cloud, sessions, notes, stats, seed + suas rotas [id]).

Work Log:
- Li contexto: worklog.md, src/lib/auth.ts (requireUserId helper), src/lib/types.ts e prisma/schema.prisma (todos os models agora têm `userId String?` + relação `user User?`).
- Li todos os 14 arquivos de rota para mapear handlers existentes (GET/POST/PUT/DELETE), filtros e contratos de resposta.
- Apliquei o padrão de auth em CADA handler exportado: `const userId = await requireUserId(); if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });` no topo, antes de qualquer lógica.
- Rotas GET de listagem: adicionei `userId` ao `where` (subjects, cloud) ou ao objeto `where: Record<string, unknown>` existente preservando todos os filtros (tasks, links, sessions, notes).
- Rotas POST: setei `userId` em todo `db.<model>.create({ data: { ..., userId } })`.
- Rotas [id] (PUT/DELETE): após auth check, faço `db.<model>.findFirst({ where: { id, userId } })` e retorno 404 `{ error: "Não encontrado" }` se não existir OU não pertencer ao usuário. Só então executo update/delete por `id`. Padrão aplicado em subjects, tasks, links, cloud, sessions e notes.
- /api/stats/route.ts: auth check no topo + `where: { userId }` em todos os 5 findMany (tasks, sessions, subjects, links, notes). Lógica de agregação (tasksByType, tasksByPriority, studyBySubject, studyLast7Days, tasksLast7Days, todayTasks, upcomingTasks, completionRate) preservada integralmente.
- /api/seed/route.ts: auth check no topo; troquei `db.subject.count()` por `db.subject.count({ where: { userId } })` (só semeia se ESTE usuário não tiver dados); adicionei `userId` aos 4 `subject.create`, a cada objeto dos 4 `createMany` (tasks, links, notes, studySessions) e ao `cloudConnection.create` final.
- Verificação via grep: 39 ocorrências de `requireUserId` (1 import + 1 check por handler = 39 = 14 imports + 25 handlers), 25 "Não autorizado" (1 por handler) e 11 "Não encontrado" (1 por PUT/DELETE nas [id], sendo 5 rotas com PUT+DELETE = 10 + 1 em sessions/[id] = 11). Contagens batem.
- NÃO rodei lint/build/servers. NÃO modifiquei /api/setup, /api/auth/* ou qualquer arquivo fora dos 14 listados.

Stage Summary:
- Arquivos atualizados (14):
  1. src/app/api/subjects/route.ts (GET filtered by userId; POST sets userId)
  2. src/app/api/subjects/[id]/route.ts (PUT, DELETE com verificação de posse → 404)
  3. src/app/api/tasks/route.ts (GET com userId no where; POST sets userId)
  4. src/app/api/tasks/[id]/route.ts (PUT, DELETE com verificação de posse)
  5. src/app/api/links/route.ts (GET com userId no where; POST sets userId)
  6. src/app/api/links/[id]/route.ts (PUT, DELETE com verificação de posse)
  7. src/app/api/cloud/route.ts (GET filtered by userId; POST sets userId)
  8. src/app/api/cloud/[id]/route.ts (PUT, DELETE com verificação de posse)
  9. src/app/api/sessions/route.ts (GET com userId no where; POST sets userId)
  10. src/app/api/sessions/[id]/route.ts (DELETE com verificação de posse)
  11. src/app/api/notes/route.ts (GET com userId no where; POST sets userId)
  12. src/app/api/notes/[id]/route.ts (PUT, DELETE com verificação de posse)
  13. src/app/api/stats/route.ts (auth check + todos os findMany filtrados por userId)
  14. src/app/api/seed/route.ts (auth check + count por userId + userId em todos os creates)
- Contratos preservados: response shapes, status codes de sucesso (200/201), include/orderBy, validações 400 e handlers de erro 500 intactos. Apenas adicionado o gate de auth (401) e o gate de posse (404) onde aplicável.
- Próximo passo sugerido: o frontend já não deveria ver dados de outros usuários. Se o orchestrador quiser, pode rodar o lint/build para validar tipos TypeScript (todos os `data` adicionados com `userId` são compatíveis pois o campo é `String?`).

---
Task ID: R1-R5
Agent: main (orchestrator) + subagent R3
Task: RECREAÇÃO do sistema de login (arquivos foram perdidos em reset do ambiente)

Work Log:
- Diagnóstico: ambiente foi resetado por commits automáticos do sistema (UUIDs). TODOS os arquivos de auth foram perdidos: schema sem User, sem bcrypt, providers sem SessionProvider, page.tsx sem useSession, app-shell sem UserCard/Sair, 14 API routes sem requireUserId.
- R1: Reinstalado bcryptjs + @types/bcryptjs. Schema reescrito com model User + userId em todos os 6 models. db:push executado.
- R2: Recriados src/lib/auth.ts (NextAuth Credentials + bcrypt + JWT + requireUserId), src/app/api/auth/[...nextauth]/route.ts, src/app/api/auth/register/route.ts. /api/setup já tinha a versão libSQL com User (preservada).
- R3 [subagente]: 14 API routes re-atualizadas com auth (requireUserId no topo de cada handler, where: {userId} nas queries, userId nos creates, findFirst+404 em PUT/DELETE). 39 ocorrências de requireUserId confirmadas.
- R4: Recriados providers.tsx (SessionProvider), login-view.tsx (Tabs Entrar/Criar conta), page.tsx (useSession → LoginView se não autenticado). app-shell.tsx: UserCard (avatar+iniciais+nome+email) + botão Sair substituiu "Dica do dia".
- R5: .env com NEXTAUTH_SECRET/URL. Commit imediato (7ce3487) para não perder de novo. Zip recriado (141 arquivos, antes 134) — confirmado que inclui auth.ts, [...nextauth]/route.ts, register/route.ts, login-view.tsx.

Verificação com Agent Browser (tudo confirmado):
- Tela de login aparece (Tabs Entrar/Criar conta).
- POST /api/auth/register → 201 (usuário criado).
- GET /api/stats sem auth → 401 {"error":"Não autorizado"}.
- Login via UI → app carrega com sidebar + botão "Sair" + UserCard.
- Usuário novo vê 0 tarefas (isolamento OK).
- Lint: 0 erros.

Stage Summary:
- Sistema de login RECREADO e funcionando. Commit 7ce3487 garante que não se perca de novo.
- Zip em download/estudaai.zip agora tem 141 arquivos (inclui todos os de auth).
- Usuário precisa: baixar zip novo, substituir pasta, commit+push no GitHub Desktop, aguardar Vercel redeploy.

---
Task ID: R6
Agent: general-purpose (rewrite API routes to libSQL)
Task: Rewrote 14 API routes from Prisma to direct libSQL for Vercel compatibility

Work Log:
- Li o contexto: worklog.md, src/lib/auth.ts (referência de requireUserId já com libSQL), src/app/api/setup/route.ts (referência de createClient + execute), src/app/api/auth/register/route.ts (referência de query parametrizada), src/lib/types.ts e prisma/schema.prisma (estrutura de tabelas/colunas).
- Li os 14 arquivos de API routes existentes para preservar exatamente os response shapes, status codes (200/201/400/401/404/500) e a lógica de cada handler.
- Estabeleci padrão: cada route importa `createClient` de `@libsql/client` + `requireUserId` de `@/lib/auth`, e define um `getClient()` inline (lê `DATABASE_URL`/`DATABASE_AUTH_TOKEN`). Geração de IDs via `genId(prefix)` = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,10)}`. Sempre uso `{sql, args}` parameterizado para qualquer query com input do usuário.
- subjects/route.ts: GET executa 3 queries COUNT GROUP BY "subjectId" (Task/Link/Note) em paralelo, monta maps e adiciona `_count` por disciplina. POST faz INSERT e retorna o objeto criado.
- subjects/[id]/route.ts: PUT/DELETE com SELECT de posse (id+userId → 404 se não existir), UPDATE dinâmico (sets/args baseados em campos undefined), re-SELECT após UPDATE para retornar o objeto atualizado.
- tasks/route.ts: GET com WHERE dinâmica (date/subjectId/status/from/to) + LEFT JOIN Subject (alias subject_*). ORDER BY date ASC, "startTime" ASC. POST com INSERT e re-SELECT com JOIN para incluir subject.
- tasks/[id]/route.ts: PUT/DELETE com ownership check, UPDATE dinâmico, re-SELECT com JOIN.
- links/route.ts e links/[id]/route.ts: mesmo padrão (LEFT JOIN Subject, filter por subjectId/category, ORDER BY createdAt DESC).
- cloud/route.ts: GET simples, POST gera `sim_${provider}_${ts}_${rand}` como accessToken, INSERT com connected=1 (SQLite boolean). Retorna o objeto construído (não re-SELECT porque accessToken já é conhecido).
- cloud/[id]/route.ts: PUT/DELETE, UPDATE dinâmico (connected/folderName/folderUrl/accountName), converte boolean para 0/1 ao salvar e 0/1→boolean ao ler.
- sessions/route.ts: GET com filter subjectId/from/to + LEFT JOIN Subject, ORDER BY createdAt DESC. POST com INSERT.
- sessions/[id]/route.ts: DELETE com ownership check.
- notes/route.ts: GET com filter subjectId + LEFT JOIN Subject, ORDER BY pinned DESC, "updatedAt" DESC (pinned é 0/1 no SQLite). POST com INSERT (pinned ? 1 : 0).
- notes/[id]/route.ts: PUT/DELETE com ownership check, UPDATE dinâmico, conversão de pinned.
- stats/route.ts: 5 queries em paralelo (tasks com JOIN, sessions com JOIN, subjects, COUNT links, COUNT notes). Agregação em JS (igual à versão Prisma original): tasksByType, tasksByPriority, studyBySubject, studyLast7Days, tasksLast7Days, todayTasks, upcomingTasks, completionRate. Retorna o mesmo shape `Stats`.
- seed/route.ts: POST com auth. COUNT de Subject WHERE userId → se >0 retorna "Já existem dados." Senão: cria 4 subjects (captura IDs), depois tasks (8), links (5), notes (3), sessions (7), cloud connection (1) — todos com INSERTs sequenciais parametrizados. Usa fmt(offset) para datas como na versão original.
- Verificação com ripgrep: 0 arquivos em src/app/api importando de "@/lib/db" (todos os 14 foram migrados). As únicas 2 ocorrências de "prisma" em src/app/api estão em setup/route.ts e auth/register/route.ts (comentários "sem Prisma", que NÃO são meus arquivos). createClient aparece em 16 arquivos (14 meus + 2 de referência).

Stage Summary:
- Arquivos atualizados (14):
  - src/app/api/subjects/route.ts
  - src/app/api/subjects/[id]/route.ts
  - src/app/api/tasks/route.ts
  - src/app/api/tasks/[id]/route.ts
  - src/app/api/links/route.ts
  - src/app/api/links/[id]/route.ts
  - src/app/api/cloud/route.ts
  - src/app/api/cloud/[id]/route.ts
  - src/app/api/sessions/route.ts
  - src/app/api/sessions/[id]/route.ts
  - src/app/api/notes/route.ts
  - src/app/api/notes/[id]/route.ts
  - src/app/api/stats/route.ts
  - src/app/api/seed/route.ts
- Não foram tocados: src/app/api/setup/route.ts, src/app/api/auth/*, src/lib/auth.ts, src/lib/db.ts.
- Todos os 14 arquivos agora usam `createClient` de `@libsql/client` diretamente (sem Prisma), seguindo o mesmo pattern de /api/setup e /api/auth/register — compatível com Vercel serverless.
- Response shapes e status codes preservados (200/201/400/401/404/500). Booleans SQLite (connected, pinned) convertidos em ambas as direções. Datas tratadas como ISO string. Nenhuma query SQL concatena input do usuário (tudo parametrizado com `args`).

---
Task ID: R6-FIX
Agent: main (orchestrator)
Task: Corrigir erro 'Erro ao criar conta' na Vercel — Prisma não funciona em serverless

Work Log:
- Diagnóstico (VLM na captura do usuário): tela de login aparece, mas POST /api/auth/register retorna 500 "Erro ao criar conta".
- Causa raiz: Prisma com require()-based adapter não funciona no ambiente serverless da Vercel (mesmo bug do /api/setup que já tínhamos resolvido com libSQL direto).
- Correção: reescrever TODAS as rotas para usar @libsql/client createClient() diretamente (sem Prisma):
  - src/lib/db.ts: imports estáticos (Prisma ainda disponível para dev local file:)
  - src/lib/auth.ts: authorize() usa libSQL direto (SELECT user, bcrypt.compare)
  - /api/auth/register: INSERT via libSQL direto + retorna erro real (não genérico)
  - [Subagente R6] 14 API routes reescritas: subjects, tasks, links, cloud, sessions, notes, stats, seed — todas com createClient(), queries parametrizadas {sql,args}, LEFT JOIN Subject, booleans 0/1 convertidos
- Verificação Agent Browser local:
  - POST /api/auth/register → 201 ✅
  - Login via UI → app carrega com Sair + UserCard ✅
  - POST /api/seed → dados criados ✅
  - Dashboard: 8 tarefas, 4 disciplinas, 375min estudo ✅
  - Lint: 0 erros ✅
- Commit: todas as mudanças + zip recriado (285KB, 141 arquivos).

Stage Summary:
- Prisma completamente removido das API routes de produção. Apenas libSQL direto.
- Dev local ainda usa Prisma (file: SQLite nativo) — não afetado.
- Usuário precisa: baixar zip novo, substituir pasta, push no GitHub Desktop, aguardar Vercel redeploy.
- Variáveis de ambiente na Vercel (já configuradas): DATABASE_URL, DATABASE_AUTH_TOKEN, NEXTAUTH_SECRET, NEXTAUTH_URL.

---
Task ID: F6
Agent: general-purpose (calendar+tasks UI enhancements)
Task: Added recurrence, copy-to-date, Google Calendar link, reminder button to calendar+tasks views

Work Log:
- Li os contextos: worklog.md, types.ts (Recurrence/RECURRENCE_LABELS/RECURRENCE_SHORT/Task), recurrence.ts (expandRecurringTasks/getBaseTaskId/googleCalendarUrl), notifications.ts (notificationsSupported/getPermission/requestPermission/scheduleReminder), e as duas views.
- calendar-view.tsx:
  - Imports: adicionei CalendarPlus, Download, Bell, Info, Copy (lucide); Recurrence + RECURRENCE_LABELS (types); Popover + DropdownMenu (shadcn); helpers de recurrence.ts e notifications.ts.
  - TaskFormState agora tem `recurrence: Recurrence` e `recurrenceEndDate: string`; emptyForm inicializa ambos ("none" / "").
  - TaskBlock e UntimedCard ganharam `onReminder` prop + 2 novos botões por ocorrência (anchor `<a target=_blank rel=noreferrer>` para `googleCalendarUrl(task)` com aria-label "Adicionar ao Google Calendar"; e Bell button condicional a `task.startTime` com aria-label "Definir lembrete"), além do Trash2 existente.
  - TaskDialog recebe `onCopy: (newDate: string) => Promise<void>`, mantém estado interno copyPopoverOpen/copyDate/copying; novo bloco "Repetir" + "Repetir até" (date input desabilitado quando recurrence==="none" + hint "Deixe vazio para repetir indefinidamente"); footer reescrito com Popover "Copiar para outra data" (apenas em isEdit) ao lado de Cancelar/Salvar.
  - CalendarView: dois useMemos derivando `expandedMonthTasks = expandRecurringTasks(monthTasks, fromISO, toISO)` e `expandedDayTasks = expandRecurringTasks(selectedDayTasks, selectedDate, selectedDate)`; tasksByDay/untimedTasks/timedTasks/agendaLoading/agendaEmpty/completedCount agora consomem as listas expandidas (os contadores do header usam expandedDayTasks).
  - openEdit usa `getBaseTaskId(task.id)` para o form.id (edita a tarefa base) e carrega recurrence/recurrenceEndDate; saveMutation envia recurrence + recurrenceEndDate no payload e usa `getBaseTaskId(data.id)` na URL PUT; handleToggle e deleteMutation.mutate usam `getBaseTaskId` em todas as chamadas.
  - Novo copyMutation: POST /api/tasks com mesma carga do form mas date=nova data, status="pendente", recurrence="none"; onSuccess toast "Tarefa copiada para DD/MM/YYYY" + fecha dialog.
  - handleReminder: verifica notificationsSupported, pede requestPermission() se necessário, chama scheduleReminder(...,15) e toasta "Lembrete definido para 15 min antes" (ou "Permissão de notificação negada").
  - Header do mês ganhou DropdownMenu "Exportar" ao lado do botão "Hoje": item "Baixar .ics" como `<a href="/api/calendar/ical" download>` (cookie de sessão enviado pelo browser) e nota informativa com ícone Info explicando como sincronizar com Google Calendar via import em calendar.google.com.
  - TaskDialog/UntimedCard/TaskBlock recebem onCopy/onReminder conforme apropriado.
- tasks-view.tsx:
  - Imports: adicionados CalendarPlus, Bell, Repeat, Copy (lucide); Recurrence + RECURRENCE_LABELS + RECURRENCE_SHORT (types); Popover (shadcn); googleCalendarUrl + helpers de notifications.ts.
  - TaskFormValues agora tem recurrence + recurrenceEndDate; taskToForm/emptyForm atualizados.
  - TaskFormDialog: handleSubmit envia recurrence + recurrenceEndDate; novo handleCopy local (POST com recurrence="none", date=nova, status="pendente", mesma carga) + toast DD/MM/YYYY; Popover "Copiar para outra data" no footer (apenas em isEdit); novo bloco "Repetir" + "Repetir até" com hint.
  - TaskCard: novo anchor Google Calendar (CalendarPlus) + Bell button condicional a `task.startTime` (apenas quando tem horário) + Badge "Repeat" com RECURRENCE_SHORT[task.recurrence] quando recurrence !== "none".
  - TasksView: novo handleReminder (mesma lógica do calendar); TaskCard recebe onReminder={() => handleReminder(task)}.
- Conformidade com design rules: emerald/amber via tokens shadcn existentes (sem indigo/blue); mobile-first com `min-h-11` nos botões de toque principal; Lucide icons; pt-BR; aria-labels em todos os botões de ícone; sonner para feedback; bumpRefresh após mutations; expandRecurringTasks chamado em useMemo derivado (não armazenado em state separado); CRUD existente preservado; timeline horária e agrupamento Atrasadas/Hoje/Amanhã/Em breve intactos; toggle/delete em ocorrências recorrentes usam getBaseTaskId.

Stage Summary:
- Arquivos atualizados: `src/components/views/calendar-view.tsx` e `src/components/views/tasks-view.tsx` (apenas frontend — backend não tocado).
- Funcionalidades adicionadas:
  - Expansão de recorrência no grid mensal (pontos em cada ocorrência) e na agenda diária (cards/blocos por ocorrência) — calendar-view.
  - Campos "Repetir" (Select none/daily/weekly/monthly/yearly) e "Repetir até" (date opcional com hint) em ambos os diálogos.
  - Botão "Copiar para outra data" via Popover em ambos os diálogos de edição — POST com recurrence="none", toast DD/MM/YYYY, fecha dialog.
  - Menu "Exportar" no header do calendário com "Baixar .ics" (anchor download para /api/calendar/ical) + nota informativa de sincronização com Google Calendar.
  - Link "Adicionar ao Google Calendar" por task (anchor com googleCalendarUrl(task), target=_blank) em TaskBlock, UntimedCard e TaskCard.
  - Botão "Definir lembrete" (Bell) por task com startTime em TaskBlock, UntimedCard e TaskCard — requestPermission() + scheduleReminder(...,15) + toast.
  - Badge de recorrência (Repeat + RECURRENCE_SHORT) nos cards da Tasks view.
  - getBaseTaskId aplicado em toggle/delete/PUT do calendar para que operações em ocorrências virtuais afetem a tarefa base.
- Nenhum lint/build/server executado (conforme instrução).
