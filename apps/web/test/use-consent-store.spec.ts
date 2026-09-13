import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/** jar de cookies simples para simular document.cookie. */
function makeDoc() {
  let store = "";
  const c = {
    documentElement: { lang: "pt-BR" },
    get cookie() {
      return store;
    },
    set cookie(v: string) {
      const pair = v.split(";")[0];
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq).trim();
      const val = pair.slice(eq + 1);
      const others = store.split("; ").filter((x) => x && !x.startsWith(name + "="));
      if (val === "") store = others.join("; ");
      else store = [...others, name + "=" + val].join("; ");
    },
  };
  return c as unknown as Document;
}

describe("use-consent-store (T443 persistência do mr_consent)", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("aceitar grava mr_consent e a próxima carga relê decided=true", async () => {
    const doc = makeDoc();
    vi.stubGlobal("document", doc);
    const { useConsentStore } = await import("@/stores/use-consent-store");
    // sem cookie → não decidido (banner aparece)
    expect(useConsentStore.getState().decided).toBe(false);
    // aceita analytics+monitoring
    useConsentStore.getState().setConsent({ analytics: true, monitoring: true });
    expect(useConsentStore.getState().decided).toBe(true);
    expect(doc.cookie).toContain("mr_consent=");
    // simula refresh: novo módulo lê o cookie persistido
    vi.resetModules();
    vi.stubGlobal("document", doc);
    const reloaded = await import("@/stores/use-consent-store");
    const s = reloaded.useConsentStore.getState();
    expect(s.decided).toBe(true);
    expect(s.analytics).toBe(true);
    expect(s.monitoring).toBe(true);
  });

  it("hidratação sem consentimento de analytics purga resíduos (T438)", async () => {
    const doc = makeDoc();
    const ls = new Map<string, string>([["lgpd-consent-v1", "accepted"]]);
    vi.stubGlobal("document", doc);
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => ls.get(k) ?? null,
      setItem: (k: string, v: string) => void ls.set(k, v),
      removeItem: (k: string) => void ls.delete(k),
    });
    // sem cookie mr_consent → analytics=false → limparResiduos roda no import
    await import("@/stores/use-consent-store");
    expect(ls.has("lgpd-consent-v1")).toBe(false);
  });

  it("recusar grava mr_consent com analytics=false e remove residuos", async () => {
    const doc = makeDoc();
    doc.cookie = "ph_old_posthog=abc; path=/";
    vi.stubGlobal("document", doc);
    const { useConsentStore } = await import("@/stores/use-consent-store");
    useConsentStore.getState().setConsent({ analytics: false, monitoring: false });
    const s = useConsentStore.getState();
    expect(s.decided).toBe(true);
    expect(s.analytics).toBe(false);
    // limparResiduos remove ph_* cookies
    expect(doc.cookie).not.toContain("ph_old_posthog");
  });
});
