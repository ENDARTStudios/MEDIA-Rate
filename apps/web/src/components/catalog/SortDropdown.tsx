"use client";

/**
 * Ordenação do catálogo como dropdown próprio, no lugar do `<select>` nativo.
 *
 * Por que trocar: a caixa de popup do `<select>` nativo é desenhada pelo sistema
 * operacional — no tema escuro ela abre branca, com tipografia e espaçamento que não
 * seguem os tokens, e no mockup do conceito a ordenação é um botão com chevron que abre
 * um menu. Este componente faz isso com os tokens do produto.
 *
 * Acessibilidade: `role="listbox"`/`option`, `aria-expanded` no gatilho, foco vai ao
 * primeiro item ao abrir, `Esc` fecha devolvendo o foco, setas navegam e a seleção é
 * anunciada por `aria-selected`.
 */
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OpcaoDeOrdem {
  value: string;
  label: string;
}

export function SortDropdown({
  valor,
  opcoes,
  rotulo,
  aoEscolher,
}: {
  valor: string;
  opcoes: OpcaoDeOrdem[];
  /** Nome acessível ("Ordenar"). */
  rotulo: string;
  aoEscolher: (valor: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [indiceFocado, setIndiceFocado] = useState(0);
  const gatilho = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const atual = opcoes.find((o) => o.value === valor) ?? opcoes[0];

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (evento: MouseEvent) => {
      if (
        !menu.current?.contains(evento.target as Node) &&
        !gatilho.current?.contains(evento.target as Node)
      ) {
        setAberto(false);
      }
    };
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        setAberto(false);
        gatilho.current?.focus();
        return;
      }
      if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
        evento.preventDefault();
        const passo = evento.key === "ArrowDown" ? 1 : -1;
        setIndiceFocado((i) => (i + passo + opcoes.length) % opcoes.length);
      }
      if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        const escolhida = opcoes[indiceFocado];
        if (escolhida) {
          aoEscolher(escolhida.value);
          setAberto(false);
          gatilho.current?.focus();
        }
      }
    };
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto, indiceFocado, opcoes, aoEscolher]);

  return (
    <div className="relative">
      <button
        ref={gatilho}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={`${rotulo}: ${atual?.label ?? ""}`}
        data-testid="catalog-sort"
        onClick={() => {
          setAberto((v) => !v);
          setIndiceFocado(
            Math.max(
              0,
              opcoes.findIndex((o) => o.value === valor),
            ),
          );
        }}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 text-sm text-fg-primary transition-colors hover:border-accent-indigo focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-indigo sm:w-auto"
      >
        <span className="text-xs text-fg-secondary">{rotulo}</span>
        <span className="font-semibold">{atual?.label}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-fg-secondary transition-transform", aberto && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {aberto && (
        <div
          ref={menu}
          role="listbox"
          aria-label={rotulo}
          tabIndex={-1}
          data-testid="catalog-sort-menu"
          className="absolute right-0 z-50 mt-2 min-w-[12rem] overflow-hidden rounded-lg border border-surface-border bg-surface-elevated py-1 shadow-floating"
        >
          {opcoes.map((opcao, i) => {
            const selecionada = opcao.value === valor;
            return (
              <button
                key={opcao.value || "relevancia"}
                type="button"
                role="option"
                aria-selected={selecionada}
                onClick={() => {
                  aoEscolher(opcao.value);
                  setAberto(false);
                  gatilho.current?.focus();
                }}
                onMouseEnter={() => setIndiceFocado(i)}
                data-testid={`catalog-sort-opcao-${opcao.value || "relevancia"}`}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors",
                  selecionada ? "text-fg-primary" : "text-fg-secondary",
                  i === indiceFocado ? "bg-surface-card" : "hover:bg-surface-card",
                )}
              >
                {opcao.label}
                {selecionada && (
                  <Check className="h-3.5 w-3.5 text-accent-indigo" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
