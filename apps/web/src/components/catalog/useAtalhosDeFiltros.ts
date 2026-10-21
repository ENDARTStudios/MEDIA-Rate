"use client";

/**
 * Atalhos de teclado do catálogo (spec §11: "sem atalho de teclado para focar os
 * filtros e para limpar filtros" — P2).
 *
 * Regras que o hook carrega:
 *  - **Alt como modificador**: letras soltas atrapalhariam quem digita na busca, e
 *    Alt+F/Alt+L não são consumidos pelo navegador;
 *  - **fora de campo de digitação**: com o cursor num input/textarea/select o atalho
 *    não dispara, para não roubar o foco de quem está digitando;
 *  - o hook não sabe ONDE focar: recebe `aoFocar` e `aoLimpar`, então o mesmo código
 *    serve para o desktop (sidebar visível) e o mobile (abre o drawer).
 */
import { useEffect } from "react";

export interface AtalhosDeFiltros {
  aoFocar: () => void;
  aoLimpar: () => void;
}

export function useAtalhosDeFiltros({ aoFocar, aoLimpar }: AtalhosDeFiltros): void {
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (!evento.altKey || evento.ctrlKey || evento.metaKey) return;
      const alvo = evento.target as HTMLElement | null;
      const digitando =
        !!alvo &&
        (alvo.tagName === "INPUT" ||
          alvo.tagName === "TEXTAREA" ||
          alvo.tagName === "SELECT" ||
          alvo.isContentEditable);
      if (digitando) return;

      const tecla = evento.key.toLowerCase();
      if (tecla === "f") {
        evento.preventDefault();
        aoFocar();
      }
      if (tecla === "l") {
        evento.preventDefault();
        aoLimpar();
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoFocar, aoLimpar]);
}
