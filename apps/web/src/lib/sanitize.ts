import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitiza HTML dinâmico com DOMPurify (T5.4).
 *
 * Uso:
 *   const clean = sanitizeHtml(dirtyHtml);
 *   return <div dangerouslySetInnerHTML={{ __html: clean }} />;
 *
 * DOMPurify isomorphic: funciona em server (Node) e client (browser).
 * Remove scripts, event handlers, javascript: URIs, etc.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
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
    ALLOWED_ATTR: ["href", "title", "class", "target", "rel"],
    ALLOW_DATA_ATTR: false,
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
