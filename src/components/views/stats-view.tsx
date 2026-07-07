"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Link2,
  ListChecks,
  PieChart as PieIcon,
  TrendingUp,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { TASK_TYPE_LABELS, type Stats, type TaskType } from "@/lib/types";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Hex palette aligned with TASK_TYPE_COLORS (badge classes) for Recharts slices.
const TASK_TYPE_HEX: Record<TaskType, string> = {
  atividade: "#0ea5e9",
  prova: "#f43f5e",
  trabalho: "#f59e0b",
  estudo: "#10b981",
  leitura: "#8b5cf6",
};

function fmtMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtDay(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function StatsView() {
  const refreshKey = useAppStore((s) => s.refreshKey);

  const { data, isLoading } = useQuery({
    queryKey: ["stats", refreshKey],
    queryFn: () => api<Stats>("/api/stats"),
  });

  if (isLoading || !data) {
    return (
      <div className="animate-fade-in space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-44" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      </div>
    );
  }

  const pieData = (Object.entries(data.tasksByType) as [TaskType, number][])
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: TASK_TYPE_LABELS[k], value: v, color: TASK_TYPE_HEX[k] }));

  const hasStudy7 = data.studyLast7Days.some((d) => d.minutes > 0);
  const hasTasks7 = data.tasksLast7Days.some((d) => d.created > 0 || d.completed > 0);
  const hasStudyBySubject = data.studyBySubject.length > 0;

  return (
    <div className="animate-fade-in space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <BarChart3 className="size-6 text-emerald-500" /> Estatísticas
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe sua produtividade acadêmica.
        </p>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<CheckCircle2 className="size-5 text-emerald-500" />}
          label="Tarefas concluídas"
          value={`${data.completedTasks}/${data.totalTasks}`}
          hint={`${Math.round(data.completionRate)}% de conclusão`}
        />
        <KpiCard
          icon={<Clock className="size-5 text-amber-500" />}
          label="Minutos de estudo"
          value={fmtMinutes(data.totalStudyMinutes)}
          hint="Tempo total acumulado"
        />
        <KpiCard
          icon={<BookOpen className="size-5 text-emerald-500" />}
          label="Disciplinas"
          value={String(data.totalSubjects)}
          hint="Cadastradas"
        />
        <KpiCard
          icon={<Link2 className="size-5 text-amber-500" />}
          label="Links salvos"
          value={String(data.totalLinks)}
          hint="Recursos catalogados"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-emerald-500" /> Estudo nos últimos 7 dias
            </CardTitle>
            <CardDescription>Minutos estudados por dia.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasStudy7 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={data.studyLast7Days}
                  margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDay}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(v) => [`${Number(v)} min`, "Minutos"]}
                    labelFormatter={(l) => fmtDay(String(l))}
                    cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                  />
                  <Bar dataKey="minutes" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart text="Sem estudo registrado nos últimos 7 dias." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieIcon className="size-4 text-amber-500" /> Tarefas por tipo
            </CardTitle>
            <CardDescription>Distribuição das tarefas cadastradas.</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${Number(v)} tarefa(s)`, String(n)]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart text="Nenhuma tarefa cadastrada ainda." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-emerald-500" /> Tarefas: criadas x concluídas
            </CardTitle>
            <CardDescription>Últimos 7 dias.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasTasks7 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={data.tasksLast7Days}
                  margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDay}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <Tooltip labelFormatter={(l) => fmtDay(String(l))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="created"
                    name="Criadas"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Concluídas"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart text="Sem atividade de tarefas nos últimos 7 dias." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4 text-amber-500" /> Tempo de estudo por disciplina
            </CardTitle>
            <CardDescription>Minutos totais por disciplina.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasStudyBySubject ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  layout="vertical"
                  data={data.studyBySubject}
                  margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="subjectName"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={90}
                  />
                  <Tooltip
                    formatter={(v) => [`${Number(v)} min`, "Minutos"]}
                    cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                  />
                  <Bar dataKey="minutes" radius={[0, 6, 6, 0]}>
                    {data.studyBySubject.map((d) => (
                      <Cell key={d.subjectId} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart text="Nenhuma sessão de estudo registrada ainda." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="gap-2 py-5">
      <CardContent className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon}
        </div>
        <p className="text-3xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed px-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
