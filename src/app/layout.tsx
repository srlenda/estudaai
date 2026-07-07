import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EstudaAí — Gerenciador de Tarefas Acadêmico",
  description:
    "Organize sua vida acadêmica: calendário de atividades por horário, disciplinas, links de estudo, integração com nuvem, timer Pomodoro e estatísticas de produtividade.",
  keywords: [
    "estudo",
    "tarefas",
    "acadêmico",
    "calendário",
    "pomodoro",
    "estudante",
    "produtividade",
  ],
  authors: [{ name: "EstudaAí" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "EstudaAí",
    description: "Gerenciador de tarefas acadêmico para estudantes",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
