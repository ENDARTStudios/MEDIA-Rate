/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import {
  PaginationDto,
  paginateCursor,
  encodeCursor,
  decodeCursor,
  validateSortField,
} from "../src/common/pagination.helper.js";

describe("Pagination helper (T4.5 + T4.6 sort allowlist)", () => {
  describe("PaginationDto", () => {
    it("aplica defaults: limit=20, direction=forward", () => {
      const result = PaginationDto.parse({});
      expect(result.limit).toBe(20);
      expect(result.direction).toBe("forward");
      expect(result.cursor).toBeUndefined();
    });

    it("limit max 100 — rejeita >100", () => {
      expect(() => PaginationDto.parse({ limit: 101 })).toThrow();
    });

    it("limit min 1 — rejeita 0", () => {
      expect(() => PaginationDto.parse({ limit: 0 })).toThrow();
    });

    it("limit coerce de string", () => {
      const result = PaginationDto.parse({ limit: "50" });
      expect(result.limit).toBe(50);
    });

    it("direction aceita 'backward'", () => {
      const result = PaginationDto.parse({ direction: "backward" });
      expect(result.direction).toBe("backward");
    });

    it("direction rejeita valor inválido", () => {
      expect(() => PaginationDto.parse({ direction: "sideways" })).toThrow();
    });
  });

  describe("encodeCursor / decodeCursor", () => {
    it("round-trip: decode(encode(x)) === x", () => {
      const original = "uuid-1234-abcd";
      const encoded = encodeCursor(original);
      const decoded = decodeCursor(encoded);
      expect(decoded).toBe(original);
    });

    it("cursor é opaque (não revela o valor diretamente)", () => {
      const encoded = encodeCursor("secret-uuid-123");
      expect(encoded).not.toContain("secret-uuid-123");
    });
  });

  describe("paginateCursor()", () => {
    it("retorna data + next_cursor + has_more quando há mais itens", async () => {
      const mockFindMany = vi.fn().mockResolvedValue([
        { id: "1", titulo: "Item 1" },
        { id: "2", titulo: "Item 2" },
        { id: "3", titulo: "Item 3" }, // extra item → has_more
      ]);
      const mockPrisma = { midia: { findMany: mockFindMany } };

      const result = await paginateCursor<{ id: string; titulo: string }>({
        // biome-ignore lint/suspicious/noExplicitAny: mock
        prisma: mockPrisma as any,
        model: "midia",
        cursor_field: "id",
        params: { limit: 2, direction: "forward" },
        orderBy: { created_at: "desc" },
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]!.id).toBe("1");
      expect(result.has_more).toBe(true);
      expect(result.next_cursor).not.toBeNull();
      expect(result.previous_cursor).toBeNull();
    });

    it("retorna has_more=false quando não há mais itens", async () => {
      const mockFindMany = vi.fn().mockResolvedValue([
        { id: "1", titulo: "Item 1" },
        { id: "2", titulo: "Item 2" },
      ]);
      const mockPrisma = { midia: { findMany: mockFindMany } };

      const result = await paginateCursor<{ id: string; titulo: string }>({
        // biome-ignore lint/suspicious/noExplicitAny: mock
        prisma: mockPrisma as any,
        model: "midia",
        cursor_field: "id",
        params: { limit: 5, direction: "forward" },
      });

      expect(result.data).toHaveLength(2);
      expect(result.has_more).toBe(false);
      expect(result.next_cursor).toBeNull();
    });

    it("busca limit+1 para detectar has_more", async () => {
      const mockFindMany = vi.fn().mockResolvedValue([]);
      const mockPrisma = { midia: { findMany: mockFindMany } };

      await paginateCursor({
        // biome-ignore lint/suspicious/noExplicitAny: mock
        prisma: mockPrisma as any,
        model: "midia",
        cursor_field: "id",
        params: { limit: 20, direction: "forward" },
      });

      const callArg = mockFindMany.mock.calls[0]![0];
      expect(callArg.take).toBe(21); // limit + 1
    });

    it("aplica where e orderBy do caller", async () => {
      const mockFindMany = vi.fn().mockResolvedValue([]);
      const mockPrisma = { midia: { findMany: mockFindMany } };

      await paginateCursor({
        // biome-ignore lint/suspicious/noExplicitAny: mock
        prisma: mockPrisma as any,
        model: "midia",
        cursor_field: "id",
        params: { limit: 10, direction: "forward" },
        where: { tipo: "FILME" },
        orderBy: { titulo: "asc" },
      });

      const callArg = mockFindMany.mock.calls[0]![0];
      expect(callArg.where).toEqual({ tipo: "FILME" });
      expect(callArg.orderBy).toEqual({ titulo: "asc" });
    });
  });

  describe("validateSortField() — allowlist (T4.6)", () => {
    const ALLOWED = ["titulo", "ano_lancamento", "created_at"] as const;

    it("permite campo na allowlist", () => {
      const result = validateSortField("titulo", ALLOWED);
      expect(result).toEqual({ field: "titulo", direction: "asc" });
    });

    it("permite campo:direção", () => {
      const result = validateSortField("titulo:desc", ALLOWED);
      expect(result).toEqual({ field: "titulo", direction: "desc" });
    });

    it("rejeita campo fora da allowlist", () => {
      const result = validateSortField("password_hash", ALLOWED);
      expect(result).toBeNull();
    });

    it("rejeita campo vazio", () => {
      const result = validateSortField(undefined, ALLOWED);
      expect(result).toBeNull();
    });

    it("direção inválida default para asc", () => {
      const result = validateSortField("titulo:invalid", ALLOWED);
      expect(result).toEqual({ field: "titulo", direction: "asc" });
    });
  });
});
