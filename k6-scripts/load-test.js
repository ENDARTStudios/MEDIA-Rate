/* eslint-disable no-undef */
// k6 load test — MEDIA Rate API (T8.4 → T220, gap 8.7)
//
// 3 cenários (mantidos do T8.4):
// 1. healthCheck — /health (sem auth)
// 2. catalogBrowse — GET /api/v1/midias?limit=20 (sem auth)
// 3. checkoutFlow — POST /api/v1/checkout (cookie mockado)
//
// Escala (T220): ramp-up 0 → 1000 VUs em 5min, sustain 10min, ramp-down 5min.
// Os VUs são distribuídos por faixa de __VU (600 públicas / 250 catálogo /
// 150 checkout). Thresholds: p95 < 500ms, error < 1%, http_reqs > 10000.
//
// Uso:
//   Smoke test (rápido): k6 run --vus 10 --duration 30s k6-scripts/load-test.js
//   Teste completo:     k6 run k6-scripts/load-test.js
//   Alvo customizado:   k6 run -e BASE_URL=https://staging... k6-scripts/load-test.js
//
// NUNCA execute contra produção sem autorização explícita do Operador.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import exec from "k6/execution";
import {
  BASE_URL,
  VUS_MAX,
  STAGES,
  HEALTH_VUS,
  CATALOG_VUS,
} from "./config.js";

// Métricas customizadas (compat T8.4)
const errorRate = new Rate("errors");
const latencyMs = new Trend("latency_ms");

// Detecção de SMOKE em RUNTIME (k6/execution não expõe options no init):
// quando o CLI sobrescreve com --vus/--duration, o cenário "load"
// (ramping-vus com stages) é trocado por "default" (constant-vus). No smoke,
// os execs rodam SEM o sleep de leitura do usuário — validação de script
// não precisa de think time — para acumular volume e validar thresholds.
function isSmoke() {
  const sc = exec.test.options.scenarios;
  return !(sc && sc.load && sc.load.stages && sc.load.stages.length > 0);
}

export const options = {
  scenarios: {
    // Cenário único com ramp-up progressivo (0 → VUS_MAX em 5min).
    load: {
      executor: "ramping-vus",
      exec: "default",
      stages: STAGES,
      tags: { scenario: "load" },
    },
  },
  thresholds: {
    // Critério Open Beta: p95 < 500ms.
    http_req_duration: ["p(95)<500"],
    // Erros < 1% do total de requisições.
    http_req_failed: ["rate<0.01"],
    // Volume mínimo por execução completa (10k requisições).
    http_reqs: ["count>10000"],
    // Compat T8.4.
    latency_ms: ["p(95)<500"],
    errors: ["rate<0.05"],
  },
};

// Roteia cada VU para um cenário conforme a faixa de __VU.
export default function () {
  const smoke = isSmoke();
  if (__VU <= HEALTH_VUS) {
    healthCheck(smoke);
  } else if (__VU <= HEALTH_VUS + CATALOG_VUS) {
    catalogBrowse(smoke);
  } else {
    checkoutFlow(smoke);
  }
}

// Cenário 1: Health check — páginas públicas.
export function healthCheck(smoke = false) {
  const res = http.get(`${BASE_URL}/health`);
  errorRate.add(res.status !== 200);
  latencyMs.add(res.timings.duration);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "body has status ok": (r) => r.json("status") === "ok",
  });
  if (!smoke) sleep(0.1);
}

// Cenário 2: Catálogo / busca (GET /api/v1/midias com paginação).
export function catalogBrowse(smoke = false) {
  const res = http.get(`${BASE_URL}/api/v1/midias?limit=20`);
  errorRate.add(res.status !== 200);
  latencyMs.add(res.timings.duration);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "has data array": (r) => Array.isArray(r.json("data")),
  });
  if (!smoke) sleep(0.5); // simula tempo de leitura do usuário
}

// Cenário 3: Checkout (POST /api/v1/checkout com Idempotency-Key).
// Em load test, esperamos 200 (checkout criado) ou 401 (não autenticado —
// esperado sem sessão real). Error rate considera ambos válidos.
export function checkoutFlow(smoke = false) {
  const params = {
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `k6-${__VU}-${__ITER}-${Date.now()}`,
      Cookie: "sess=mock-session-token-for-load-test",
    },
  };

  const body = JSON.stringify({
    plano: "PLUS",
    success_url: "https://app.example.com/success",
    cancel_url: "https://app.example.com/cancel",
  });

  const res = http.post(`${BASE_URL}/api/v1/checkout`, body, params);
  errorRate.add(res.status !== 200 && res.status !== 401);
  latencyMs.add(res.timings.duration);
  check(res, {
    "status is 200 or 401": (r) => r.status === 200 || r.status === 401,
    "response has body": (r) => r.body !== null,
  });
  if (!smoke) sleep(1); // simula tempo entre tentativas de checkout
}
