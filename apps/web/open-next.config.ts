import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import kvNextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/kv-next-tag-cache";

/**
 * T454 (D-507) — config do OpenNext para o runtime Cloudflare Workers.
 *
 * - `kvIncrementalCache`: cache incremental DURÁVEL (binding
 *   `NEXT_INC_CACHE_KV`) — faz o ISR `revalidate = 3600` da home (T447)
 *   sobreviver entre isolates. Sem a KV, cache é por-isolado.
 * - `kvNextTagCache`: tag cache (binding `NEXT_TAG_CACHE_KV`) — permite o
 *   `/api/revalidate` on-demand (T447) purgar além do isolate local.
 *
 * Provisionamento das duas namespaces KV: Operador (checklist em
 * docs/DEPLOY_CLOUDFLARE.md). O build local (`npm run build:cf`) funciona
 * sem as bindings — elas são resolvidas no deploy.
 */
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  tagCache: kvNextTagCache,
});
