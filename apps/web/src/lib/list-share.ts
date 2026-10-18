/**
 * Listas — texto de compartilhamento e linhas do PDF.
 *
 * Funções puras de propósito: o convite e o conteúdo do PDF são o que a pessoa manda
 * para um amigo e o que ela arquiva depois. Se isso mora dentro do componente, só é
 * testável com DOM; aqui é testável com string, e o componente vira encanamento.
 *
 * Regras que valem para os dois formatos:
 * - a **descrição da lista é o recado** ("para quem você fez isto") — ela abre o convite
 *   e o PDF, não fica escondida no rodapé;
 * - item sem nota ou sem ano aparece sem o campo (nada de "null" ou "—" no PDF);
 * - o link é sempre o público da lista (`/listas/<slug>`), porque compartilhar lista é
 *   dar o link — não existe "acesso restrito" no produto.
 */

export interface ListaItemResumo {
  titulo: string | null;
  tipo: string | null;
  ano: number | null;
  score: number | null;
}

export interface ListaResumo {
  titulo: string;
  descricao: string | null;
  slug: string;
  donoNome: string | null;
  itens: ListaItemResumo[];
}

/** Rótulos vêm do i18n — a função pura não conhece idioma. */
export interface RotulosConvite {
  /** ex.: "Lista de {dono}" — já formatado pela camada de i18n. */
  byOwner: string;
  /** ex.: "3 indicações" — já formatado. */
  itemsCount: string;
  /** ex.: "Veja a lista:" — linha opcional antes do link. */
  seeList: string;
}

const normalizar = (texto: string) => texto.replace(/\s+/g, " ").trim();

/**
 * Convite para mandar no WhatsApp/Telegram/e-mail: título, recado, contagem e link.
 * Uma linha em branco entre o recado e o link para o mensageiro não colar tudo.
 */
export function montarConvite(lista: ListaResumo, url: string, rotulos: RotulosConvite): string {
  const linhas: string[] = [];
  linhas.push(normalizar(lista.titulo));
  const recado = lista.descricao ? normalizar(lista.descricao) : null;
  if (recado) linhas.push(recado);
  linhas.push(`${rotulos.byOwner} · ${rotulos.itemsCount}`);
  linhas.push("");
  linhas.push(rotulos.seeList);
  linhas.push(url);
  return linhas.join("\n");
}

/** "filme" → "FILME" (o tipo vem da API em caixa alta; tolera as duas formas). */
const tipoLegivel = (tipo: string | null) => (tipo ? tipo.toUpperCase() : null);

/**
 * Linha de um item: "1. Título — FILME · 2019 · 8.4".
 * Campo ausente desaparece; nunca vira "null"/"undefined" no PDF do usuário.
 */
export function linhaDoItem(item: ListaItemResumo, indice: number): string {
  const titulo = item.titulo ? normalizar(item.titulo) : "(sem título)";
  const meta = [tipoLegivel(item.tipo), item.ano ? String(item.ano) : null]
    .filter(Boolean)
    .join(" · ");
  const nota = item.score != null ? ` · ${item.score.toFixed(1)}` : "";
  return `${indice + 1}. ${titulo}${meta ? ` — ${meta}` : ""}${nota}`;
}

/** Todas as linhas do item, na ordem em que aparecem no PDF. */
export function linhasDosItens(lista: ListaResumo): string[] {
  return lista.itens.map((item, i) => linhaDoItem(item, i));
}

/** Nome do arquivo: slug limpo, sempre `.pdf`. */
export function nomeArquivoPdf(slug: string): string {
  const limpo = slug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `lista-${limpo || "sem-titulo"}.pdf`;
}

/**
 * Link público da lista. `origin` é injetado (testável e correto atrás de proxy):
 * em SSR não existe `window`, e o domínio de marca é o canônico do produto.
 */
export function urlDaLista(slug: string, locale: string, origin?: string): string {
  const base = (origin ?? "https://mediarate.app").replace(/\/+$/, "");
  return `${base}/${locale}/listas/${encodeURIComponent(slug)}`;
}
