/**
 * Serializa um objeto para JSON-LD de forma segura para uso em
 * `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ... }}>`.
 *
 * Escapa `<` como `\u003c` para impedir que qualquer string injetada
 * (ex.: synopsis vinda da API contendo `</script>`) escape do script tag.
 *
 * Este módulo NÃO deve importar dependências pesadas (ex.: jsdom) —
 * ele é carregado no bundle server-side de todas as páginas.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
