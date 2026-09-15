import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * T463 (D-493) — config mínima do OpenNext para o build local (`build:cf`).
 *
 * DRAFT-PENDING-PROVISIONING (T454): o cache incremental durável (necessário
 * para o ISR revalidate 3600s do T447 sobreviver entre isolates) e o loader
 * de imagens (Cloudflare Images) entram AQUI quando a T454 executar com
 * provisioning real — ver docs/DEPLOY_CLOUDFLARE.md (matriz, itens 2 e 3).
 * Nada de credenciais/IDs neste arquivo.
 */
export default defineCloudflareConfig({});
