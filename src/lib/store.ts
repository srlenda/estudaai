"use client";

import { create } from "zustand";
import type { ViewKey } from "@/lib/types";

interface AppState {
  // Navegação entre views
  currentView: ViewKey;
  setView: (view: ViewKey) => void;

  // Data selecionada no calendário (formato ISO YYYY-MM-DD)
  selectedDate: string;
  setSelectedDate: (date: string) => void;

  // Filtro de disciplina ativo (usado em várias views)
  subjectFilter: string | null;
  setSubjectFilter: (id: string | null) => void;

  // Sidebar mobile aberta
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Versão de "refresh" para forçar re-fetch quando dados mudam
  refreshKey: number;
  bumpRefresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: "dashboard",
  setView: (view) => set({ currentView: view, sidebarOpen: false }),

  selectedDate: new Date().toISOString().slice(0, 10),
  setSelectedDate: (date) => set({ selectedDate: date }),

  subjectFilter: null,
  setSubjectFilter: (id) => set({ subjectFilter: id }),

  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  refreshKey: 0,
  bumpRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
