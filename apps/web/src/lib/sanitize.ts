import sanitizeHtmlLib from "sanitize-html";

/**
 * Sanitiza HTML dinâmico (T5.4).
 *
 * Uso:
 *   const clean = sanitizeHtml(dirtyHtml);
 *   return <div dangerouslySetInnerHTML={{ __html: clean }} />;
 *
 * sanitize-html (CJS puro, sem jsdom): funciona em server (Node) e client (browser).
 * Remove scripts, event handlers, javascript: URIs, etc.
 */
export function sanitizeHtml(dirty: string): string {
  return sanitizeHtmlLib(dirty, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "a",
      "span",
      "div",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "code",
      "pre",
    ],
    allowedAttributes: {
      "*": ["href", "title", "class", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

/**
 * Verifica se um HTML já está sanitizado (heurística para evitar dupla sanitização).
 */
export function isSanitized(html: string): boolean {
  // Se não contém tags perigosas, considera sanitizado.
  const dangerous = /<script|on\w+\s*=|javascript:/i;
  return !dangerous.test(html);
}
