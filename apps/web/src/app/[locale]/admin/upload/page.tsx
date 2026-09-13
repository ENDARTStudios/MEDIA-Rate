"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

/**
 * T453 — UI admin mínima de upload de assets (R2).
 *
 * Envia para POST /api/v1/admin/assets/:midiaId/:tipoMidia (admin-only).
 * Estados de erro claros (415/413/401/403/404). Interna (noindex); texto em
 * PT por ser ferramenta de administração.
 */
export default function AdminUploadPage() {
  const [midiaId, setMidiaId] = useState("");
  const [tipo, setTipo] = useState("filme");
  const [file, setFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    if (!file || !midiaId.trim()) {
      setErro("Informe a mídia e selecione um arquivo.");
      return;
    }
    setEnviando(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:4000";
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `${base}/api/v1/admin/assets/${encodeURIComponent(midiaId.trim())}/${encodeURIComponent(tipo)}`,
        { method: "POST", body: fd, credentials: "include" },
      );
      const body = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
      if (!res.ok) {
        setErro(
          res.status === 415
            ? "Tipo não suportado — use JPEG, PNG, WebP ou AVIF."
            : res.status === 413
              ? "Arquivo acima de 10 MiB."
              : res.status === 401
                ? "Sessão expirada — faça login."
                : res.status === 403
                  ? "Apenas administradores."
                  : res.status === 404
                    ? "Mídia não encontrada."
                    : (body.message ?? `Falha no upload (${res.status}).`),
        );
        return;
      }
      setOk(body.url ?? "Upload concluído.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
        Upload de assets (R2)
      </h1>
      <form onSubmit={enviar} className="space-y-4">
        <label className="block">
          <span className="text-sm text-gray-600 dark:text-gray-300">ID da mídia</span>
          <input
            value={midiaId}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMidiaId(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            placeholder="uuid da mídia"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600 dark:text-gray-300">Tipo</span>
          <select
            value={tipo}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setTipo(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="filme">filme</option>
            <option value="serie">serie</option>
            <option value="game">game</option>
            <option value="livro">livro</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-gray-600 dark:text-gray-300">Arquivo (JPEG/PNG/WebP/AVIF, máx 10 MiB)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={enviando}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {enviando ? "Enviando…" : "Enviar"}
        </button>
      </form>

      {erro && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {erro}
        </p>
      )}
      {ok && (
        <p className="mt-4 break-all text-sm text-green-600">
          Enviado: <code>{ok}</code>
        </p>
      )}
    </div>
  );
}
