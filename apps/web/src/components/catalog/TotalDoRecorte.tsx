"use client";

/**
 * Total do recorte compartilhado entre a grade e a sidebar de filtros.
 *
 * Por que existe: o conceito v1 do catálogo (§3 bloco 5) põe a contagem do recorte
 * NO RODAPÉ DA SIDEBAR — é onde o olho está quando se mexe num filtro. Hoje a
 * contagem só aparece acima da grade, longe do controle que a mudou.
 *
 * O número nasce no `CatalogContent` (é ele que tem `data.total` da API/consulta) e
 * é lido pela sidebar. Sem contexto, a alternativa era duplicar a consulta ou
 * passar `total` por props através de um Suspense — o contexto é o caminho mais
 * curto que mantém UMA fonte de verdade.
 *
 * `null` = ainda não há resposta (primeira carga): a sidebar mostra o esqueleto do
 * texto, não um "0" que mentiria sobre o acervo.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface TotalDoRecorte {
  total: number | null;
  definirTotal: (valor: number | null) => void;
}

const Contexto = createContext<TotalDoRecorte | null>(null);

export function TotalDoRecorteProvider({ children }: { children: ReactNode }) {
  const [total, definirTotal] = useState<number | null>(null);
  const valor = useMemo(() => ({ total, definirTotal }), [total]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Lê o total do recorte. Fora do provider devolve `null` (uso tolerante em testes). */
export function useTotalDoRecorte(): TotalDoRecorte {
  return useContext(Contexto) ?? { total: null, definirTotal: () => undefined };
}
