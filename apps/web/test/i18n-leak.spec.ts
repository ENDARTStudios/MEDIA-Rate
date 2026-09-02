import { describe, it, expect } from "vitest";
import ptBR from "@/messages/pt-BR.json";
import enUS from "@/messages/en-US.json";
import esES from "@/messages/es-ES.json";

/**
 * T271 — i18n-leak (estrutural): as chaves usadas pelo register/OAuth existem
 * nos 3 locales e não vazam português em EN/ES. O teste e2e/i18n-leak.spec.ts
 * cobre o HTML SSR renderizado; este cobre as mensagens na fonte.
 */

type Locale = Record<string, Record<string, string>>;
const LOCALES: Record<string, Locale> = {
  "pt-BR": ptBR as unknown as Locale,
  "en-US": enUS as unknown as Locale,
  "es-ES": esES as unknown as Locale,
};

const CHAVES_AUTH_NOVAS = [
  "continueWithGoogle",
  "continueWithApple",
  "socialComingSoon",
  "socialIntegrating",
  "consentAnd",
];

describe("T271 — i18n-leak: chaves do auth/register", () => {
  it("chaves de OAuth/consentimento existem nos 3 locales", () => {
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      const a = msgs.auth;
      for (const k of CHAVES_AUTH_NOVAS) {
        expect(a[k], `${loc}.auth.${k}`).toBeTruthy();
      }
    }
  });

  it("botões OAuth: EN e ES nunca em PT ('com Google/Apple')", () => {
    expect(LOCALES["en-US"].auth.continueWithGoogle).toBe("Continue with Google");
    expect(LOCALES["en-US"].auth.continueWithApple).toBe("Continue with Apple");
    expect(LOCALES["es-ES"].auth.continueWithGoogle).toBe("Continuar con Google");
    expect(LOCALES["es-ES"].auth.continueWithApple).toBe("Continuar con Apple");
    for (const loc of ["en-US", "es-ES"] as const) {
      expect(LOCALES[loc].auth.continueWithGoogle).not.toContain("com Google");
      expect(LOCALES[loc].auth.continueWithApple).not.toContain("com Apple");
    }
  });

  it("conjunção do consentimento localizada (nunca 'e a' em EN/ES)", () => {
    expect(LOCALES["pt-BR"].auth.consentAnd).toBe("e a");
    expect(LOCALES["en-US"].auth.consentAnd).toBe("and");
    expect(LOCALES["es-ES"].auth.consentAnd).toBe("y la");
    for (const loc of ["en-US", "es-ES"] as const) {
      expect(LOCALES[loc].auth.consentAnd).not.toBe("e a");
    }
  });

  it("es-ES usa pontuação de abertura no hasAccount", () => {
    expect(LOCALES["es-ES"].auth.hasAccount).toBe("¿Ya tienes cuenta?");
    expect(LOCALES["es-ES"].auth.hasAccount).not.toBe("Ya tienes cuenta?");
  });
});

describe("T272 — i18n-leak: selo de prévia por locale", () => {
  it("catalog.previewBadge existe nos 3 locales", () => {
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      expect(msgs.catalog.previewBadge, `${loc}.catalog.previewBadge`).toBeTruthy();
    }
  });

  it("tradução correta por locale (nunca PT em EN/ES)", () => {
    // SELO curto do card (previewBadge) é "Prévia"/"Preview"/"Previo". O texto
    // longo "— fontes em preparação" é o TOOLTIP (previewBadgeTitle) — o teste
    // antigo confundia os dois e esperava o tooltip no badge.
    expect(LOCALES["pt-BR"].catalog.previewBadge).toBe("Prévia");
    expect(LOCALES["en-US"].catalog.previewBadge).toBe("Preview");
    expect(LOCALES["es-ES"].catalog.previewBadge).toBe("Previo");
    for (const loc of ["en-US", "es-ES"] as const) {
      expect(LOCALES[loc].catalog.previewBadge).not.toContain("Prévia");
    }
  });

  it("tooltip de prévia (previewBadgeTitle) localizado e nunca PT em EN/ES", () => {
    expect(LOCALES["pt-BR"].catalog.previewBadgeTitle).toBe("Prévia — fontes em preparação");
    expect(LOCALES["en-US"].catalog.previewBadgeTitle).toBe("Preview — sources in preparation");
    expect(LOCALES["es-ES"].catalog.previewBadgeTitle).toBe("Previo — fuentes en preparación");
    for (const loc of ["en-US", "es-ES"] as const) {
      expect(LOCALES[loc].catalog.previewBadgeTitle).not.toContain("Prévia");
    }
  });
});

describe("T273 — i18n-leak: consistência locale estrutural", () => {
  it("footer.lgpd é rótulo localizado (nunca 'LGPD' cru) nos 3 locales", () => {
    expect(LOCALES["pt-BR"].footer.lgpd).toBe("Seus dados");
    expect(LOCALES["en-US"].footer.lgpd).toBe("Your data");
    expect(LOCALES["es-ES"].footer.lgpd).toBe("Sus datos");
    for (const loc of ["pt-BR", "en-US", "es-ES"] as const) {
      expect(LOCALES[loc].footer.lgpd, `${loc}.footer.lgpd`).not.toBe("LGPD");
    }
    expect(LOCALES["pt-BR"].footer.lgpd).not.toContain("(LGPD)");
  });

  it("catalog.exploreCategory existe e EN não vaza 'Explorar' PT", () => {
    expect(LOCALES["pt-BR"].catalog.exploreCategory).toBe("Explorar {label}");
    expect(LOCALES["en-US"].catalog.exploreCategory).toBe("Explore {label}");
    expect(LOCALES["es-ES"].catalog.exploreCategory).toBe("Explorar {label}");
    expect(LOCALES["en-US"].catalog.exploreCategory).not.toContain("Explorar");
  });
});
