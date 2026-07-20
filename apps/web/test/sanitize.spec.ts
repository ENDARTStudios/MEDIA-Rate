import { describe, it, expect } from "vitest";
import { sanitizeHtml, isSanitized } from "../src/lib/sanitize";

describe("sanitizeHtml (T5.4)", () => {
  it("remove tags <script>", () => {
    const dirty = '<p>texto</p><script>alert("xss")</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("<script>");
    expect(clean).toContain("<p>texto</p>");
  });

  it("remove event handlers (onclick, onload, etc)", () => {
    const dirty = '<p onclick="alert(1)">texto</p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("onclick");
  });

  it("remove javascript: URIs", () => {
    const dirty = '<a href="javascript:alert(1)">link</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("javascript:");
  });

  it("preserva tags permitidas (p, strong, em, a, ul, li)", () => {
    const dirty = "<p>texto <strong>negrito</strong> <em>italico</em></p>";
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain("<p>");
    expect(clean).toContain("<strong>");
    expect(clean).toContain("<em>");
  });

  it("preserva href em <a>", () => {
    const dirty = '<a href="https://example.com">link</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('href="https://example.com"');
  });

  it("remove atributos data-*", () => {
    const dirty = '<p data-evil="xss">texto</p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("data-evil");
  });

  it("preserva conteúdo texto", () => {
    const dirty = "<p>Olá mundo</p>";
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain("Olá mundo");
  });
});

describe("isSanitized (T5.4)", () => {
  it("retorna true para HTML sem tags perigosas", () => {
    expect(isSanitized("<p>texto seguro</p>")).toBe(true);
  });

  it("retorna false para HTML com <script>", () => {
    expect(isSanitized("<script>alert(1)</script>")).toBe(false);
  });

  it("retorna false para HTML com event handler", () => {
    expect(isSanitized('<p onclick="x">t</p>')).toBe(false);
  });

  it("retorna false para javascript: URI", () => {
    expect(isSanitized('<a href="javascript:x">l</a>')).toBe(false);
  });
});
