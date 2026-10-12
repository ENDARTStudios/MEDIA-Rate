/**
 * T196-b (#93/#98) — contrato da remoção de blocos <script> do HTML SSR
 * (varredura determinística, sem regex de tag e sem `replace` de multichar).
 *
 * O gate i18n-leak analisa o HTML **sem** os scripts (o flight payload do RSC
 * carrega o dicionário de mensagens; as chaves crus aparecem ali como dados de
 * hidratação, não como texto visível). Este spec fixa o contrato do helper:
 * a detecção de vazamento real (texto/chave fora de script) precisa continuar.
 */
import { describe, it, expect } from "vitest";
import { semScripts } from "../e2e/utils/sem-scripts";

describe("semScripts (T196-b) — HTML sem blocos <script>", () => {
  it("remove um bloco <script> simples e preserva o resto", () => {
    const html = `<html><body><h1>Olá</h1><script>var a=1;</script><p>Fim</p></body></html>`;
    expect(semScripts(html)).toBe(`<html><body><h1>Olá</h1><p>Fim</p></body></html>`);
  });

  it("remove script com atributos e conteúdo multilinha/unicode", () => {
    const html = `<div>texto</div><script type="application/json" async>\n  {"k":"çãé"}\n</script><span>x</span>`;
    expect(semScripts(html)).toBe(`<div>texto</div><span>x</span>`);
  });

  it("é case-insensitive (SCRIPT/</SCRIPT >)", () => {
    const html = `<a>1</a><SCRIPT>x</SCRIPT ><b>2</b>`;
    expect(semScripts(html)).toBe(`<a>1</a><b>2</b>`);
  });

  it("remove <script/> autofechado sem comer o restante", () => {
    expect(semScripts(`<i>a</i><script src="x.js" /><b>b</b>`)).toBe(`<i>a</i><b>b</b>`);
    expect(semScripts(`<i>a</i><script/><b>b</b>`)).toBe(`<i>a</i><b>b</b>`);
  });

  it("múltiplos scripts são todos removidos", () => {
    const html = `<s>1</s><script>a</script><s>2</s><script>b</script><s>3</s>`;
    expect(semScripts(html)).toBe(`<s>1</s><s>2</s><s>3</s>`);
  });

  it("chave i18n DENTRO de script não aparece no resultado (sem falso positivo)", () => {
    const html = `<p>texto</p><script>self.__next_f.push("continueWithGoogle")</script>`;
    const visivel = semScripts(html);
    expect(visivel).not.toContain("continueWithGoogle");
    expect(visivel).toContain("texto");
  });

  it("chave i18n crua FORA de script continua DETECTÁVEL (não enfraquece o gate)", () => {
    const html = `<p>continueWithGoogle</p><script>ok</script>`;
    expect(semScripts(html)).toContain("continueWithGoogle");
  });

  it("tag que apenas começa com 'script' (scriptt) é preservada", () => {
    const html = `<scriptt>conteudo</scriptt>`;
    expect(semScripts(html)).toBe(html);
  });

  it("script sem fechamento descarta dali para frente (fail-safe)", () => {
    const html = `<p>antes</p><script>var x = "continueWithGoogle";`;
    const visivel = semScripts(html);
    expect(visivel).toBe(`<p>antes</p>`);
    expect(visivel).not.toContain("continueWithGoogle");
  });

  it("HTML sem script volta idêntico; vazio → vazio", () => {
    const html = `<html><body><p>só texto</p></body></html>`;
    expect(semScripts(html)).toBe(html);
    expect(semScripts("")).toBe("");
  });
});
