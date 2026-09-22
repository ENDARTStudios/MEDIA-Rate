import { ArgumentMetadata, Injectable, NotFoundException, PipeTransform } from "@nestjs/common";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Item 13 (#148) — valida params de rota que mapeiam colunas @db.Uuid
 * (watchlist_entry.id, usuario_midia_interacao.midia_id) ANTES do Prisma:
 * id malformado explodiria P2023 → 500 no findFirst/findUnique.
 *
 * Responde 404 sem distinguir malformado de inexistente (mesma semântica
 * de recurso que não existe — e sem ler nada do banco).
 */
@Injectable()
export class UuidParamPipe implements PipeTransform<string, string> {
  transform(value: string, _metadata: ArgumentMetadata): string {
    if (!UUID_RE.test(value ?? "")) {
      throw new NotFoundException("Recurso não encontrado.");
    }
    return value;
  }
}
