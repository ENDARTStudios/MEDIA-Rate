/**
 * billing-config — disponibilidade do plano anual (guarda defensiva T447).
 *
 * Lê as env de preço anual NO SERVER. Se um STRIPE_PRICE_*_YEAR_* estiver
 * ausente, o plano anual ainda NÃO está configurado (infra/negócio do Operador)
 * e o toggle anual é ocultado/desabilitado — nunca vendemos anual sem price_
 * válido no Stripe.
 *
 * Segurança: expõe apenas o boolean `annualAvailable` ao cliente — nunca o
 * valor nem a ausência do segredo em si.
 */
const PLANS = ["PLUS", "PREMIUM"];
const CURRENCIES = ["BRL", "USD", "EUR"];

export function annualAvailable(): boolean {
  for (const plan of PLANS) {
    for (const currency of CURRENCIES) {
      if (process.env[`STRIPE_PRICE_${plan}_YEAR_${currency}`]) {
        return true;
      }
    }
  }
  return false;
}
