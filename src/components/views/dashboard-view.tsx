"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  type Stats,
  type Task,
  type Subject,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  TASK_TYPE_COLORS,
  TASK_TYPE_LABELS,
  todayISO,
} from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Clock,
  CalendarDays,
  Timer,
  Link2,
  Cloud,
  BarChart3,
  StickyNote,
  BookOpen,
  ArrowRight,
  Plus,
  GraduationCap,
  Flame,
  ListTodo,
  Sparkles,
} from "lucide-react";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDatePtBR(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function daysUntil(iso: string): number {
  const today = new Date(todayISO() + "T00:00:00");
  const target = new Date(iso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function describeDays(n: number): string {
  if (n < 0) return `${Math.abs(n)} dia(s) atrasada`;
  if (n === 0) return "Hoje";
  if (n === 1) return "Amanhã";
  return `Em ${n} dias`;
}

export function DashboardView() {
  const setView = useAppStore((s) => s.setView);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const refreshKey = useAppStore((s) => s.refreshKey);
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats", refreshKey],
    queryFn: () => api<Stats>("/api/stats"),
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects", refreshKey],
    queryFn: () =>
      api<Subject[]>("/api/subjects").then((s) =>
        s as unknown as Array<Subject & { _count?: { tasks?: number; links?: number; notes?: number } }>
      ),
  });

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === "concluida" ? "pendente" : "concluida";
    await api(`/api/tasks/${task.id}`, {
      method: "PUT",
      body: JSON.stringify({ status: newStatus }),
    });
    bumpRefresh();
  };

  const studyHours = stats ? Math.floor(stats.totalStudyMinutes / 60) : 0;
  const studyMins = stats ? stats.totalStudyMinutes % 60 : 0;
  const todayMinutes = stats?.studyLast7Days?.[6]?.minutes ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho de saudação */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground capitalize">
            {formatDatePtBR(new Date())}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            {greeting()}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {stats && stats.todayTasks.length > 0
              ? `Você tem ${stats.todayTasks.length} atividade(s) para hoje.`
              : "Nenhuma atividade para hoje. Aproveite para adiantar estudos!"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setView("calendar")}>
            <CalendarDays className="h-4 w-4" />
            Calendário
          </Button>
          <Button variant="outline" onClick={() => setView("pomodoro")}>
            <Timer className="h-4 w-4" />
            Iniciar Pomodoro
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Atividades hoje"
          value={isLoading ? "—" : String(stats?.todayTasks.length ?? 0)}
          icon={ListTodo}
          tone="primary"
          hint={`${stats?.pendingTasks ?? 0} pendentes no total`}
          onClick={() => {
            setSelectedDate(todayISO());
            setView("calendar");
          }}
        />
        <KpiCard
          label="Concluídas"
          value={isLoading ? "—" : `${stats?.completedTasks ?? 0}/${stats?.totalTasks ?? 0}`}
          icon={CheckCircle2}
          tone="emerald"
          hint={`${stats?.completionRate ?? 0}% de aproveitamento`}
          onClick={() => setView("tasks")}
        />
        <KpiCard
          label="Estudo hoje"
          value={isLoading ? "—" : `${todayMinutes}m`}
          icon={Flame}
          tone="amber"
          hint={`${studyHours}h ${studyMins}m no total`}
          onClick={() => setView("pomodoro")}
        />
        <KpiCard
          label="Disciplinas"
          value={isLoading ? "—" : String(stats?.totalSubjects ?? 0)}
          icon={BookOpen}
          tone="violet"
          hint={`${stats?.totalLinks ?? 0} links salvos`}
          onClick={() => setView("subjects")}
        />
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Atividades de hoje */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Atividades de hoje
              </CardTitle>
              <CardDescription className="mt-1">
                Sua agenda do dia
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedDate(todayISO());
                setView("calendar");
              }}
            >
              Ver agenda
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : stats && stats.todayTasks.length > 0 ? (
              <ul className="space-y-2 max-h-80 overflow-y-auto custom-scroll pr-1">
                {stats.todayTasks.map((t) => (
                  <TodayTaskRow key={t.id} task={t} onToggle={() => toggleTask(t)} />
                ))}
              </ul>
            ) : (
              <EmptyMini
                icon={Sparkles}
                title="Dia livre!"
                description="Nenhuma atividade marcada para hoje."
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedDate(todayISO());
                      setView("calendar");
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Progresso geral */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Seu progresso
            </CardTitle>
            <CardDescription>Visão geral do semestre</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Tarefas concluídas</span>
                <span className="font-semibold">
                  {stats?.completedTasks ?? 0}/{stats?.totalTasks ?? 0}
                </span>
              </div>
              <Progress value={stats?.completionRate ?? 0} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1.5">
                {stats?.completionRate ?? 0}% concluído
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <MiniStat
                icon={Timer}
                label="Minutos estudados"
                value={stats ? `${stats.totalStudyMinutes}m` : "—"}
                onClick={() => setView("stats")}
              />
              <MiniStat
                icon={Link2}
                label="Links salvos"
                value={String(stats?.totalLinks ?? 0)}
                onClick={() => setView("links")}
              />
              <MiniStat
                icon={StickyNote}
                label="Notas"
                value={String(stats?.totalNotes ?? 0)}
                onClick={() => setView("notes")}
              />
              <MiniStat
                icon={Cloud}
                label="Disciplinas"
                value={String(stats?.totalSubjects ?? 0)}
                onClick={() => setView("subjects")}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Próximos prazos */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Próximos prazos
              </CardTitle>
              <CardDescription className="mt-1">
                Não deixe nada passar
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setView("tasks")}>
              Ver todas
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : stats && stats.upcomingTasks.length > 0 ? (
              <ul className="space-y-2 max-h-72 overflow-y-auto custom-scroll pr-1">
                {stats.upcomingTasks.map((t) => {
                  const days = daysUntil(t.date);
                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0">
                        <span className="text-[10px] uppercase leading-none">
                          {new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR", {
                            month: "short",
                          })}
                        </span>
                        <span className="text-lg font-bold leading-none mt-0.5">
                          {new Date(t.date + "T00:00:00").getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{t.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${TASK_TYPE_COLORS[t.type]}`}
                          >
                            {TASK_TYPE_LABELS[t.type]}
                          </Badge>
                          {t.subject && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: t.subject.color }}
                              />
                              {t.subject.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${
                          days < 0
                            ? "border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-400"
                            : days <= 1
                            ? "border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400"
                            : ""
                        }`}
                      >
                        {describeDays(days)}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyMini
                icon={CheckCircle2}
                title="Tudo em dia!"
                description="Não há prazos próximos."
              />
            )}
          </CardContent>
        </Card>

        {/* Disciplinas + atalhos */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                Minhas disciplinas
              </CardTitle>
              <CardDescription>Acesso rápido</CardDescription>
            </CardHeader>
            <CardContent>
              {subjects && subjects.length > 0 ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto custom-scroll pr-1">
                  {subjects.slice(0, 5).map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => setView("subjects")}
                        className="w-full flex items-center gap-2.5 rounded-lg p-2 hover:bg-muted/60 transition-colors text-left"
                      >
                        <span
                          className="h-8 w-8 rounded-md grid place-items-center text-white text-xs font-bold shrink-0"
                          style={{ background: s.color }}
                        >
                          {s.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {s._count?.tasks ?? 0} tarefas
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma disciplina ainda.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Atalhos
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <ShortcutBtn icon={Timer} label="Pomodoro" onClick={() => setView("pomodoro")} />
              <ShortcutBtn icon={Link2} label="Links" onClick={() => setView("links")} />
              <ShortcutBtn icon={Cloud} label="Nuvem" onClick={() => setView("cloud")} />
              <ShortcutBtn icon={StickyNote} label="Notas" onClick={() => setView("notes")} />
              <ShortcutBtn icon={BarChart3} label="Estatísticas" onClick={() => setView("stats")} />
              <ShortcutBtn icon={BookOpen} label="Disciplinas" onClick={() => setView("subjects")} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  hint?: string;
  tone: "primary" | "emerald" | "amber" | "violet";
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  };
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow py-0 gap-0 overflow-hidden"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
            {hint && <p className="text-[11px] text-muted-foreground mt-1 truncate">{hint}</p>}
          </div>
          <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${tones[tone]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-1 rounded-lg border p-3 hover:bg-muted/50 transition-colors text-left"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-lg font-semibold tabular-nums leading-none">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </button>
  );
}

function TodayTaskRow({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: () => void;
}) {
  const done = task.status === "concluida";
  return (
    <li className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
      <button
        onClick={onToggle}
        aria-label={done ? "Marcar como pendente" : "Marcar como concluída"}
        className={`h-5 w-5 rounded-full border-2 grid place-items-center shrink-0 transition-colors ${
          done
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-primary"
        }`}
      >
        {done && <CheckCircle2 className="h-3 w-3" />}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            done ? "line-through text-muted-foreground" : ""
          }`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {task.startTime && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
              <Clock className="h-3 w-3" />
              {task.startTime}
              {task.endTime ? `–${task.endTime}` : ""}
            </span>
          )}
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 ${TASK_TYPE_COLORS[task.type]}`}
          >
            {TASK_TYPE_LABELS[task.type]}
          </Badge>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>
          {task.subject && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: task.subject.color }}
              />
              {task.subject.name}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function EmptyMini({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="h-12 w-12 rounded-full bg-muted grid place-items-center mb-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function ShortcutBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-lg border p-3 hover:bg-muted/50 hover:border-primary/40 transition-colors"
    >
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}
