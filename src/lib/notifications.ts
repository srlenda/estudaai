"use client";

/**
 * Helper para notificações do navegador (Web Notifications API).
 *
 * Funciona quando o app está aberto. Para notificações push em background
 * (app fechado), seria necessário PWA + Service Worker + push service.
 */

export type NotificationPermission = "default" | "granted" | "denied";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPermission(): NotificationPermission {
  if (!notificationsSupported()) return "denied";
  return Notification.permission as NotificationPermission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermission;
  } catch {
    return "denied";
  }
}

export function showNotification(
  title: string,
  options?: NotificationOptions
): void {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      icon: "/logo.svg",
      badge: "/logo.svg",
      ...options,
    });
  } catch {
    // ignora erro (alguns navegadores bloqueiam em certos contextos)
  }
}

/**
 * Agenda um lembrete para uma tarefa.
 * Retorna uma função para cancelar o lembrete.
 *
 * @param taskTitle Título da tarefa
 * @param taskDate Data da tarefa (YYYY-MM-DD)
 * @param taskStartTime Horário de início (HH:mm) ou null
 * @param minutesBefore Minutos antes do horário (default 15)
 */
export function scheduleReminder(
  taskTitle: string,
  taskDate: string,
  taskStartTime: string | null,
  minutesBefore: number = 15
): () => void {
  if (!taskStartTime) return () => {};

  const [y, m, d] = taskDate.split("-").map(Number);
  const [sh, sm] = taskStartTime.split(":").map(Number);
  const taskTime = new Date(y, (m || 1) - 1, d || 1, sh || 0, sm || 0);
  const remindAt = new Date(taskTime.getTime() - minutesBefore * 60 * 1000);
  const now = new Date();
  const delay = remindAt.getTime() - now.getTime();

  if (delay <= 0) {
    // Já passou — notifica imediatamente
    showNotification(`📌 ${taskTitle}`, {
      body: `Horário: ${taskStartTime}`,
    });
    return () => {};
  }

  const timer = setTimeout(() => {
    showNotification(`📌 ${taskTitle}`, {
      body: `Às ${taskStartTime} — faltam ${minutesBefore} min`,
      tag: taskTitle,
    });
  }, delay);

  return () => clearTimeout(timer);
}
