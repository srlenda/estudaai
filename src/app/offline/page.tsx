"use client";

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background:
          "linear-gradient(135deg, #ecfdf5 0%, #ffffff 50%, #fffbeb 100%)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#1f2937",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "5rem",
          height: "5rem",
          borderRadius: "1rem",
          background: "#10b981",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1.5rem",
          boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.3)",
        }}
      >
        <svg
          width="2.5rem"
          height="2.5rem"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 2L11 13" />
          <path d="M22 2L15 22L11 13L2 9L22 2Z" />
        </svg>
      </div>
      <h1
        style={{
          fontSize: "1.875rem",
          fontWeight: 700,
          marginBottom: "0.5rem",
          color: "#065f46",
        }}
      >
        Você está offline
      </h1>
      <p
        style={{
          fontSize: "0.95rem",
          color: "#6b7280",
          maxWidth: "28rem",
          lineHeight: 1.6,
          marginBottom: "1.5rem",
        }}
      >
        Não foi possível conectar à internet. Verifique sua conexão e tente
        novamente. Dados já carregados podem continuar disponíveis em outras
        abas do app.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: "#10b981",
          color: "white",
          border: "none",
          padding: "0.75rem 1.5rem",
          borderRadius: "0.5rem",
          fontWeight: 600,
          fontSize: "0.95rem",
          cursor: "pointer",
          boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.2)",
        }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
