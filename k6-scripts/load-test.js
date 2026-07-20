/* eslint-disable no-undef */
// k6 load test — MEDIA Rate API (T8.4)
//
// 3 cenários:
// 1. Health check: 100 VUs por 30s (sem auth)
// 2. Catálogo: 50 VUs por 30s (sem auth, GET /api/v1/midias)
// 3. Checkout: 10 VUs por 20s (com auth — precisa de cookie de sessão)
//
// Uso: k6 run k6-scripts/load-test.js
//
// Pré-requisitos:
// - API rodando em http://localhost:4000 (ou setar API_BASE_URL)
// - k6 instalado: https://k6.io/docs/getting-started/installation/

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const API_BASE_URL = __ENV.API_BASE_URL || "http://localhost:4000";

// Métricas customizadas
const errorRate = new Rate("errors");
const latencyMs = new Trend("latency_ms");

// Configuração dos cenários
export const options = {
  scenarios: {
    // Cenário 1: Health check — 100 VUs por 30s
    health_check: {
      executor: "constant-vus",
      vus: 100,
      duration: "30s",
      exec: "healthCheck",
      tags: { scenario: "health" },
    },
    // Cenário 2: Catálogo — 50 VUs por 30s
    catalog: {
      executor: "constant-vus",
      vus: 50,
      duration: "30s",
      exec: "catalogBrowse",
      startTime: "30s", // após health_check
      tags: { scenario: "catalog" },
    },
    // Cenário 3: Checkout — 10 VUs por 20s (com auth)
    checkout: {
      executor: "constant-vus",
      vus: 10,
      duration: "20s",
      exec: "checkoutFlow",
      startTime: "60s", // após catalog
      tags: { scenario: "checkout" },
    },
  },
  thresholds: {
    // 95% das requisições devem ter latência < 500ms
    latency_ms: ["p(95)<500"],
    // Taxa de erro < 5%
    errors: ["rate<0.05"],
    // 99% das requisições HTTP devem ter sucesso
    http_req_failed: ["rate<0.01"],
  },
};

// Cenário 1: Health check
export function healthCheck() {
  const res = http.get(`${API_BASE_URL}/health`);
  errorRate.add(res.status !== 200);
  latencyMs.add(res.timings.duration);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "body has status ok": (r) => r.json("status") === "ok",
  });
  sleep(0.1);
}

// Cenário 2: Catálogo (GET /api/v1/midias com paginação)
export function catalogBrowse() {
  const res = http.get(`${API_BASE_URL}/api/v1/midias?limit=20`);
  errorRate.add(res.status !== 200);
  latencyMs.add(res.timings.duration);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "has data array": (r) => Array.isArray(r.json("data")),
  });
  sleep(0.5); // simula tempo de leitura do usuário
}

// Cenário 3: Checkout (POST /api/v1/checkout com Idempotency-Key)
// Em produção, precisa de cookie de sessão. No teste, usa cookie mockado.
export function checkoutFlow() {
  // Em produção, o cookie vem do login. Aqui usamos um cookie mock.
  const params = {
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `k6-${__VU}-${__ITER}-${Date.now()}`,
      "Cookie": "sess=mock-session-token-for-load-test",
    },
  };

  const body = JSON.stringify({
    plano: "PLUS",
    success_url: "https://app.example.com/success",
    cancel_url: "https://app.example.com/cancel",
  });

  const res = http.post(`${API_BASE_URL}/api/v1/checkout`, body, params);
  // Em load test, esperamos 200 (checkout criado) ou 401 (não autenticado — esperado sem sessão real).
  errorRate.add(res.status !== 200 && res.status !== 401);
  latencyMs.add(res.timings.duration);
  check(res, {
    "status is 200 or 401": (r) => r.status === 200 || r.status === 401,
    "response has body": (r) => r.body !== null,
  });
  sleep(1); // simula tempo entre tentativas de checkout
}
