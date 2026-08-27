"use client";

import { GraduationCap, Moon, Sun, Menu, LogOut, Clock, ShieldCheck } from "lucide-react";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import { useAppStore } from "@/lib/store";
import type { ViewKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  BookOpen,
  Link2,
  Cloud,
  Timer,
  BarChart3,
  StickyNote,
} from "lucide-react";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ElementType;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Início", icon: LayoutDashboard, description: "Visão geral" },
  { key: "calendar", label: "Calendário", icon: CalendarDays, description: "Agenda por horários" },
  { key: "tasks", label: "Tarefas", icon: CheckSquare, description: "Todas as atividades" },
  { key: "subjects", label: "Disciplinas", icon: BookOpen, description: "Cursos e matérias" },
  { key: "links", label: "Links", icon: Link2, description: "Biblioteca de recursos" },
  { key: "cloud", label: "Nuvem", icon: Cloud, description: "Drive e OneDrive" },
  { key: "pomodoro", label: "Pomodoro", icon: Timer, description: "Sessões de estudo" },
  { key: "stats", label: "Estatísticas", icon: BarChart3, description: "Produtividade" },
  { key: "notes", label: "Notas", icon: StickyNote, description: "Anotações" },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Alternar tema"
      className="h-9 w-9"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentView, setView, sidebarOpen, setSidebarOpen } = useAppStore();
  // Rastreia atividade do usuário para renovar sessão "não manter conectado"
  useActivityTracker();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Topbar (mobile) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/95 backdrop-blur px-4 h-14">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-bold tracking-tight">EstudaAí</span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground sticky top-0 h-screen">
          <SidebarContent
            currentView={currentView}
            setView={setView}
          />
        </aside>

        {/* Sidebar mobile (drawer) */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
            <aside className="relative w-72 max-w-[80vw] bg-sidebar text-sidebar-foreground flex flex-col animate-fade-in">
              <SidebarContent
                currentView={currentView}
                setView={setView}
                onClose={() => setSidebarOpen(false)}
              />
            </aside>
          </div>
        )}

        {/* Conteúdo principal */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="hidden lg:flex items-center justify-end px-6 h-14 border-b bg-background/95 backdrop-blur sticky top-0 z-20">
            <ThemeToggle />
          </div>
          <div className="flex-1 px-4 sm:px-6 py-6 animate-fade-in">
            {children}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  currentView,
  setView,
  onClose,
}: {
  currentView: ViewKey;
  setView: (v: ViewKey) => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b">
        <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold tracking-tight leading-none">EstudaAí</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Sua agenda acadêmica
          </p>
        </div>
      </div>

      <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto custom-scroll">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                setView(item.key);
                onClose?.();
              }}
              className={cn(
                "w-full group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t">
        <UserCard />
      </div>
    </div>
  );
}

function UserCard() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  const name = session.user.name || "Usuário";
  const email = session.user.email || "";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // rememberMe é exposto via callback session (ver auth.ts)
  const rememberMe = (session as unknown as { rememberMe?: boolean }).rememberMe ?? true;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 rounded-lg bg-muted/60 p-2.5">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate leading-none">{name}</p>
          <p className="text-[11px] text-muted-foreground truncate mt-1">{email}</p>
        </div>
      </div>
      <div
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1"
        title={
          rememberMe
            ? "Sessão de 30 dias — você ficará conectado"
            : "Sessão temporária — sairá automaticamente após 8h ou 30 min de inatividade"
        }
      >
        {rememberMe ? (
          <>
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            <span>Manter conectado (30 dias)</span>
          </>
        ) : (
          <>
            <Clock className="h-3 w-3 text-amber-500" />
            <span>Sessão temporária (8h / 30 min inativo)</span>
          </>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        <LogOut className="h-3.5 w-3.5" />
        Sair
      </Button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t bg-background px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">EstudaAí</span> · Organize
          sua vida acadêmica com foco e produtividade.
        </p>
        <p className="flex items-center gap-1.5">
          Feito para estudantes
          <span aria-hidden>·</span>
          <span>© {new Date().getFullYear()}</span>
        </p>
      </div>
    </footer>
  );
}
