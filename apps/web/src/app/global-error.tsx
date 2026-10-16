"use client";

/**
 * D-582.5 (T211) — `global-error.tsx`: última linha de defesa do App Router.
 *
 * Antes deste arquivo não havia nenhum `global-error.tsx`: um throw no layout
 * raiz caía na tela **default do Next** (sem marca, sem i18n, sem caminho de
 * volta). Aqui não é possível usar `next-intl` (o provider vive no layout que
 * falhou), então o texto é curto e neutro, com o vocabulário da marca.
 *
 * Regras: precisa declarar `<html>`/`<body>` (substitui o layout raiz) e ser
 * client component (o App Router exige `reset`).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05050A",
          color: "#F5F5F7",
          fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <p
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#FB7185",
              margin: "0 0 0.75rem",
            }}
          >
            MEDIA Rate
          </p>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.75rem" }}>
            Algo quebrou por aqui
          </h1>
          <p style={{ color: "#A0A0B8", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
            Não foi possível carregar a aplicação. Tente novamente — se persistir, o incidente já
            está registrado com o código abaixo.
          </p>
          {error.digest && (
            <p style={{ color: "#85859F", fontSize: "0.8125rem", margin: "0 0 1.5rem" }}>
              Código: <code style={{ color: "#A0A0B8" }}>{error.digest}</code>
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#E11D48",
              color: "#FFFFFF",
              border: 0,
              borderRadius: "0.5rem",
              padding: "0.875rem 2rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
