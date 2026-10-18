/**
 * Registro público de patrocínios.
 *
 * Existe para tornar verificável o guardrail que a página `/apoie` publica: **patrocínio
 * compra visibilidade, não nota**. Sem registro, "a nota não está à venda" é promessa;
 * com registro, é fato conferível por qualquer pessoa.
 *
 * Regras para adicionar uma entrada:
 * 1. **autorização por escrito** do patrocinador para publicar o nome (nada de "cliente
 *    confidencial" — o rótulo é parte do produto);
 * 2. `rotulo` descreve como o patrocínio aparece na interface (ex.: "Conteúdo patrocinado —
 *    banner no topo da seção Cinema"), porque a transparência é sobre o rótulo, não sobre o
 *    contrato;
 * 3. a data é a de início da veiculação, não a de assinatura;
 * 4. nada aqui altera score, ordem de ranking ou linha editorial — e uma entrada que precise
 *    disso não entra: recusa registrada em `docs/07-operations-marketing/APOIO-PARCERIA-PATROCINIO.md`.
 *
 * Lista vazia é o estado real de hoje: o registro nasce vazio e só cresce com acordo fechado.
 */

export interface Patrocinio {
  /** Nome público autorizado por escrito. */
  patrocinador: string;
  /** Onde o patrocínio aparece, em texto que a pessoa reconhece na tela. */
  secao: string;
  /** Como está rotulado na interface. */
  rotulo: string;
  /** Início da veiculação (ISO 8601, `YYYY-MM-DD`). */
  desde: string;
}

/**
 * Teto de concentração: nenhum patrocinador deve passar de 40% do financiamento total.
 * Acima disso a independência vira ficção contábil — o número é política, não métrica, por
 * isso vive como constante e não como campo de cada entrada.
 */
export const TETO_CONCENTRACAO = 0.4;

/** Ordenado por início (mais recente primeiro) quando houver entradas. */
export const PATROCINIOS: Patrocinio[] = [];
