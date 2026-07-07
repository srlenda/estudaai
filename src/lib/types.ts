// Tipos compartilhados do EstudaAí

export type Priority = "baixa" | "media" | "alta";
export type TaskStatus = "pendente" | "em_andamento" | "concluida";
export type TaskType = "atividade" | "prova" | "trabalho" | "estudo" | "leitura";
export type LinkCategory =
  | "geral"
  | "video"
  | "artigo"
  | "livro"
  | "aula"
  | "ferramenta";
export type CloudProvider = "google_drive" | "onedrive";
export type SessionType = "pomodoro" | "manual";

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  color: string;
  professor: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:mm
  endTime: string | null; // HH:mm
  priority: Priority;
  status: TaskStatus;
  type: TaskType;
  subjectId: string | null;
  subject: Subject | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: LinkCategory;
  subjectId: string | null;
  subject: Subject | null;
  createdAt: string;
  updatedAt: string;
}

export interface CloudConnection {
  id: string;
  provider: CloudProvider;
  accountName: string;
  folderName: string;
  folderUrl: string;
  accessToken: string | null;
  connected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  subjectId: string | null;
  subject: Subject | null;
  duration: number; // minutos
  date: string; // YYYY-MM-DD
  type: SessionType;
  notes: string | null;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  subjectId: string | null;
  subject: Subject | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalStudyMinutes: number;
  totalSubjects: number;
  totalLinks: number;
  totalNotes: number;
  completionRate: number;
  tasksByType: Record<string, number>;
  tasksByPriority: Record<string, number>;
  studyBySubject: { subjectId: string; subjectName: string; minutes: number; color: string }[];
  studyLast7Days: { date: string; minutes: number }[];
  tasksLast7Days: { date: string; created: number; completed: number }[];
  upcomingTasks: Task[];
  todayTasks: Task[];
}

export type ViewKey =
  | "dashboard"
  | "calendar"
  | "tasks"
  | "subjects"
  | "links"
  | "cloud"
  | "pomodoro"
  | "stats"
  | "notes";

export const PRIORITY_LABELS: Record<Priority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  baixa: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  media: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  alta: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  atividade: "Atividade",
  prova: "Prova",
  trabalho: "Trabalho",
  estudo: "Estudo",
  leitura: "Leitura",
};

export const TASK_TYPE_COLORS: Record<TaskType, string> = {
  atividade: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
  prova: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
  trabalho: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  estudo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  leitura: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
};

export const LINK_CATEGORY_LABELS: Record<LinkCategory, string> = {
  geral: "Geral",
  video: "Vídeo",
  artigo: "Artigo",
  livro: "Livro",
  aula: "Aula",
  ferramenta: "Ferramenta",
};

// Paleta de cores para novas disciplinas
export const SUBJECT_COLORS = [
  "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316",
  "#14b8a6", "#6366f1", "#eab308", "#d946ef",
];

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
