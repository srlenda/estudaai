"use client";

import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LoginView } from "@/components/views/login-view";
import { useAppStore } from "@/lib/store";
import { DashboardView } from "@/components/views/dashboard-view";
import { CalendarView } from "@/components/views/calendar-view";
import { TasksView } from "@/components/views/tasks-view";
import { SubjectsView } from "@/components/views/subjects-view";
import { LinksView } from "@/components/views/links-view";
import { CloudView } from "@/components/views/cloud-view";
import { PomodoroView } from "@/components/views/pomodoro-view";
import { StatsView } from "@/components/views/stats-view";
import { NotesView } from "@/components/views/notes-view";
import { SeedPrompt } from "@/components/views/seed-prompt";

export default function Home() {
  const { data: session, status } = useSession();
  const { currentView } = useAppStore();

  if (status === "loading") {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando EstudaAí…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

  return (
    <AppShell>
      <SeedPrompt />
      <ViewRouter view={currentView} />
    </AppShell>
  );
}

function ViewRouter({ view }: { view: string }) {
  switch (view) {
    case "dashboard":
      return <DashboardView />;
    case "calendar":
      return <CalendarView />;
    case "tasks":
      return <TasksView />;
    case "subjects":
      return <SubjectsView />;
    case "links":
      return <LinksView />;
    case "cloud":
      return <CloudView />;
    case "pomodoro":
      return <PomodoroView />;
    case "stats":
      return <StatsView />;
    case "notes":
      return <NotesView />;
    default:
      return <DashboardView />;
  }
}
