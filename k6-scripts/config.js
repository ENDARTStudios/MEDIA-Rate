// ============================================================
// T220 (8.7) — configuração central do load test k6.
// Sobrescreva sem editar: k6 run -e BASE_URL=... -e VUS_MAX=...
// ============================================================

// Alvo do teste. DEFAULT: localhost (nunca produção sem autorização
// explícita do Operador — ver docs/LOAD_TESTING.md).
export const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";

// VUs máximo do teste de carga (critério Open Beta).
export const VUS_MAX = 1000;

// Ramp-up progressivo 0 → VUS_MAX em 5min, sustain 10min, ramp-down 5min.
export const STAGES = [
  { duration: "5m", target: VUS_MAX },
  { duration: "10m", target: VUS_MAX },
  { duration: "5m", target: 0 },
];

// Distribuição dos 1000 VUs entre os 3 cenários (soma = VUS_MAX):
export const HEALTH_VUS = 600; // páginas públicas / health
export const CATALOG_VUS = 250; // busca / catálogo
// checkoutFlow = VUS_MAX - HEALTH_VUS - CATALOG_VUS (150)
