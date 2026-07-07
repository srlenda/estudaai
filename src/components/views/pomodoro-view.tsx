"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Pause,
  RotateCcw,
  Settings2,
  Timer as TimerIcon,
  Trash2,
  Clock,
  Flame,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { todayISO, type SessionType, type StudySession, type Subject } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Mode = "focus" | "short" | "long";

const MODE_META: Record<
  Mode,
  { label: string; short: string; color: string; defaultMin: number; min: number; max: number }
> = {
  focus: { label: "Foco", short: "Foco", color: "#10b981", defaultMin: 25, min: 10, max: 60 },
  short: { label: "Pausa curta", short: "Pausa", color: "#f59e0b", defaultMin: 5, min: 1, max: 15 },
  long: { label: "Pausa longa", short: "Pausa", color: "#f59e0b", defaultMin: 15, min: 5, max: 30 },
};

function fmtTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtTimeOfDay(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const NONE = "none";

export function PomodoroView() {
  const refreshKey = useAppStore((s) => s.refreshKey);
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);
  const setView = useAppStore((s) => s.setView);
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>("focus");
  const [durations, setDurations] = useState<Record<Mode, number>>({
    focus: MODE_META.focus.defaultMin,
    short: MODE_META.short.defaultMin,
    long: MODE_META.long.defaultMin,
  });
  const [remaining, setRemaining] = useState(durations.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [subjectId, setSubjectId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [focusCount, setFocusCount] = useState(0);

  const today = todayISO();

  // Always-latest completion handler (avoids stale closures in the tick effect).
  const onCompleteRef = useRef<() => void>(() => {});

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", refreshKey],
    queryFn: () => api<Subject[]>("/api/subjects"),
  });

  const { data: todaySessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["sessions", "today", today, refreshKey],
    queryFn: () => api<StudySession[]>(`/api/sessions?from=${today}&to=${today}`),
  });

  const { data: stats } = useQuery({
    queryKey: ["stats", refreshKey],
    queryFn: () => api<{ totalStudyMinutes: number }>("/api/stats"),
  });

  const minutesToday = todaySessions.reduce((s, x) => s + x.duration, 0);

  // Disciplina efetiva: a escolhida pelo usuário ou, por padrão, a primeira
  // disponível (derivado em render — sem efeito colateral).
  const effectiveSubjectId = subjectId || (subjects.length ? subjects[0].id : "");

  const logMutation = useMutation({
    mutationFn: (vars: {
      subjectId: string | null;
      duration: number;
      type: SessionType;
      notes: string | null;
    }) =>
      api<StudySession>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          subjectId: vars.subjectId,
          duration: vars.duration,
          date: today,
          type: vars.type,
          notes: vars.notes,
        }),
      }),
    onSuccess: () => {
      bumpRefresh();
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/sessions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Sessão removida.");
      bumpRefresh();
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: () => toast.error("Erro ao remover sessão."),
  });

  function resetTimer(m: Mode = mode) {
    setRemaining(durations[m] * 60);
    setIsRunning(false);
  }

  function switchMode(m: Mode) {
    setMode(m);
    setRemaining(durations[m] * 60);
    setIsRunning(false);
  }

  function resolveSubject(): string | null {
    if (!effectiveSubjectId || effectiveSubjectId === NONE) return null;
    return effectiveSubjectId;
  }

  function logFocusMinutes(minutes: number, customNotes?: string) {
    if (minutes <= 0) return;
    logMutation.mutate(
      {
        subjectId: resolveSubject(),
        duration: minutes,
        type: "pomodoro",
        notes: customNotes ?? (notes.trim() || null),
      },
      {
        onSuccess: () => toast.success(`Sessão de ${minutes} min registrada! 🎉`),
        onError: () => toast.error("Erro ao registrar sessão."),
      },
    );
  }

  // Completion logic — kept in a ref and updated via effect so the
  // countdown effect always calls the latest closure (latest state).
  useEffect(() => {
    onCompleteRef.current = () => {
      setIsRunning(false);
      if (mode === "focus") {
        toast.success("Foco concluído! 🎉");
        logMutation.mutate({
          subjectId: resolveSubject(),
          duration: durations.focus,
          type: "pomodoro",
          notes: notes.trim() || null,
        });
        const newCount = focusCount + 1;
        setFocusCount(newCount);
        const nextMode: Mode = newCount % 4 === 0 ? "long" : "short";
        setMode(nextMode);
        setRemaining(durations[nextMode] * 60);
        setNotes("");
      } else {
        toast.success("Pausa concluída! Bora voltar ao foco 💪");
        setMode("focus");
        setRemaining(durations.focus * 60);
      }
    };
  });

  // Countdown — re-runs each second while running.
  useEffect(() => {
    if (!isRunning) return;
    if (remaining <= 0) {
      onCompleteRef.current();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [isRunning, remaining]);

  // Stop the timer if the component unmounts.
  useEffect(() => () => setIsRunning(false), []);

  const total = durations[mode] * 60;
  const progress = total > 0 ? remaining / total : 0; // 1 → full ring, 0 → empty
  const R = 120;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - progress);
  const meta = MODE_META[mode];

  const elapsedMin = Math.floor((total - remaining) / 60);
  const canLogPartial =
    mode === "focus" && !isRunning && elapsedMin > 0 && remaining > 0 && remaining < total;

  const totalMinutes = stats?.totalStudyMinutes ?? 0;

  return (
    <div className="animate-fade-in space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <TimerIcon className="size-6 text-emerald-500" /> Pomodoro
        </h1>
        <p className="text-sm text-muted-foreground">
          Concentre-se em ciclos de foco e pausas. As sessões são registradas automaticamente.
        </p>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Clock className="size-4 text-emerald-500" />}
          label="Minutos hoje"
          value={`${minutesToday} min`}
        />
        <StatCard
          icon={<Flame className="size-4 text-amber-500" />}
          label="Sessões hoje"
          value={String(todaySessions.length)}
        />
        <StatCard
          icon={<CalendarClock className="size-4 text-emerald-500" />}
          label="Minutos totais"
          value={`${totalMinutes} min`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Timer card */}
        <Card className="items-center">
          <CardHeader className="flex w-full flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Timer</CardTitle>
              <CardDescription>
                {meta.label} • {durations[mode]} min
                {focusCount > 0 ? ` • Ciclo ${focusCount}` : ""}
              </CardDescription>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Configurar durações">
                  <Settings2 />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="space-y-4">
                  <p className="text-sm font-medium">Durações (minutos)</p>
                  {(["focus", "short", "long"] as Mode[]).map((m) => (
                    <div key={m} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">{MODE_META[m].label}</Label>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {durations[m]}
                        </span>
                      </div>
                      <Slider
                        value={[durations[m]]}
                        min={MODE_META[m].min}
                        max={MODE_META[m].max}
                        step={1}
                        onValueChange={(v) => {
                          const nv = v[0];
                          setDurations((d) => ({ ...d, [m]: nv }));
                          if (m === mode && !isRunning) setRemaining(nv * 60);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent className="flex w-full flex-col items-center gap-6">
            <Tabs
              value={mode}
              onValueChange={(v) => switchMode(v as Mode)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="focus">Foco ({durations.focus})</TabsTrigger>
                <TabsTrigger value="short">Pausa ({durations.short})</TabsTrigger>
                <TabsTrigger value="long">Longa ({durations.long})</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Circular timer */}
            <div
              className="relative size-72"
              role="timer"
              aria-live="polite"
              aria-label={`${meta.label}: ${fmtTime(remaining)} restantes`}
            >
              <svg viewBox="0 0 280 280" className="size-full -rotate-90">
                <circle
                  cx="140"
                  cy="140"
                  r={R}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="14"
                  className="text-muted/40"
                />
                <circle
                  cx="140"
                  cy="140"
                  r={R}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={offset}
                  style={{
                    transition: isRunning ? "stroke-dashoffset 1s linear" : "none",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold tabular-nums">{fmtTime(remaining)}</span>
                <span className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {meta.label}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {!isRunning ? (
                <Button
                  size="lg"
                  onClick={() => setIsRunning(true)}
                  disabled={remaining === 0}
                  className="min-w-36"
                >
                  <Play /> Iniciar
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => setIsRunning(false)}
                  className="min-w-36"
                >
                  <Pause /> Pausar
                </Button>
              )}
              <Button size="lg" variant="outline" onClick={() => resetTimer()} aria-label="Reiniciar timer">
                <RotateCcw /> Reiniciar
              </Button>
              {canLogPartial && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    logFocusMinutes(elapsedMin);
                    resetTimer();
                  }}
                >
                  Registrar parcial ({elapsedMin} min)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Side: subject + notes + today's sessions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Disciplina</CardTitle>
              <CardDescription>Atribua a sessão a uma disciplina.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {subjects.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Nenhuma disciplina cadastrada.{" "}
                  <Button variant="link" className="h-auto p-0" onClick={() => setView("subjects")}>
                    Criar agora
                  </Button>
                </div>
              ) : (
                <Select value={effectiveSubjectId || NONE} onValueChange={setSubjectId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhuma (Geral)</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ background: s.color }}
                          />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="pomodoro-notes">Anotações (opcional)</Label>
                <Textarea
                  id="pomodoro-notes"
                  placeholder="O que você vai estudar nesta sessão?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sessões de hoje</CardTitle>
              <CardDescription>
                {todaySessions.length} sessão(ões) • {minutesToday} min
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : todaySessions.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhuma sessão registrada hoje ainda.
                </div>
              ) : (
                <ScrollArea className="h-72 pr-2">
                  <ul className="space-y-2">
                    {todaySessions.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center gap-3 rounded-md border p-2.5"
                      >
                        <div className="flex flex-1 flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {s.subject ? (
                              <Badge variant="secondary" className="gap-1.5">
                                <span
                                  className="size-2 rounded-full"
                                  style={{ background: s.subject.color }}
                                />
                                {s.subject.name}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Geral</Badge>
                            )}
                            <span className="text-sm font-medium">{s.duration} min</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {fmtTimeOfDay(s.createdAt)} •{" "}
                            {s.type === "pomodoro" ? "Pomodoro" : "Manual"}
                          </span>
                          {s.notes && (
                            <span className="line-clamp-1 text-xs text-muted-foreground">
                              {s.notes}
                            </span>
                          )}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Excluir sessão"
                              className="size-9 shrink-0"
                            >
                              <Trash2 className="size-4 text-muted-foreground" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-white hover:bg-destructive/90"
                                onClick={() => deleteMutation.mutate(s.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="space-y-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
