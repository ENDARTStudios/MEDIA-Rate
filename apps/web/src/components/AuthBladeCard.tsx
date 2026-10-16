"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LoginForm, RegisterForm } from "./AuthForm";
import { SocialButtons } from "./SocialButtons";

/**
 * D-595/D-596 (T211) — sessão de login com a "faixa" (band) inclinada.
 *
 * Referência: componente "Login & Signup Animation" (VERSO), enviado em capturas — a
 * mecânica está no próprio CSS do autor:
 *
 *   .auth_band  { overflow: hidden; transform: skewX(var(--rake)) translateX(var(--sweep)); }
 *   .band_inner { transform: translateX(calc(-1 * var(--sweep))) skewX(calc(-1 * var(--rake))); }
 *
 * Traduzido para cá, ponto por ponto:
 *  - **A faixa é um retângulo INCLINADO** (`skewX`), não uma lâmina reta. Ela existe
 *    **em repouso** — é a cunha que carrega o texto de marca — e é ela que viaja.
 *  - **Uma única `translateX`** por transição: a faixa sai de um repouso e chega ao
 *    outro (nunca inverte no meio) e, na metade do percurso, cobre o card por completo.
 *    É sob essa cobertura que os dois estados trocam de lugar.
 *  - **Transformação inversa no conteúdo** (`.band_inner`): o texto de dentro da faixa
 *    vive em coordenadas do CARD, então não desliza junto e não fica torto. Como a
 *    faixa tem `overflow: hidden`, é isso que **corta o título na diagonal**.
 *  - **Duas costuras** de luz nas bordas da faixa (a de ataque mais forte).
 *  - **Sem nenhum fade**: o painel que sai é escondido em um frame (`visibility`), não
 *    com opacidade — inclusive porque o gate do D-587 reprova texto invisível.
 *  - **Só `transform`**: nenhuma propriedade de layout é animada; os dois painéis
 *    ficam na MESMA célula de grid e a altura é a do maior formulário.
 *
 * Adaptações conscientes ao MEDIA Rate (o original é claro, verde/creme):
 *  - paleta escura do produto (faixa = `--surface-elevated` → `--bg`, costuras em
 *    `--accent-indigo`), porque o app é dark-only por token;
 *  - o formulário mantém o cartão próprio (`AuthForm`), que é a linguagem visual das
 *    telas de auth (bordas finas + feixe) — o efeito é o mesmo, muda o acabamento;
 *  - no mobile o texto da faixa é escondido e o repouso afasta a faixa, para o
 *    formulário usar a largura toda sem apertar.
 *
 * Movimento reduzido: sem varredura, a faixa salta direto para o repouso e os estados
 * trocam no mesmo frame.
 */

type Vista = "login" | "register";
type Lado = "direita" | "esquerda";
type Varredura = "para-direita" | "para-esquerda";

/** Duração da varredura; a troca de estado acontece quando a faixa cobre o card. */
const DURACAO_MS = 620;

export function AuthBladeCard({ initialView = "login" }: { initialView?: Vista }) {
  const [vista, setVista] = useState<Vista>(initialView);
  const [varrendo, setVarrendo] = useState<Varredura | null>(null);
  const reduzido = useRef(false);
  const timers = useRef<number[]>([]);
  const t = useTranslations("auth");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduzido.current = mq.matches;
    const aoMudar = () => {
      reduzido.current = mq.matches;
    };
    mq.addEventListener("change", aoMudar);
    return () => {
      mq.removeEventListener("change", aoMudar);
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, []);

  const trocar = useCallback(
    (destino: Vista) => {
      if (destino === vista || varrendo) return;
      if (reduzido.current) {
        setVista(destino);
        return;
      }
      // Entrar repousa com a faixa à direita; cadastrar, à esquerda (espelhado).
      setVarrendo(destino === "login" ? "para-direita" : "para-esquerda");
      // Metade do percurso = faixa cobrindo o card: é aqui que os estados trocam.
      timers.current.push(window.setTimeout(() => setVista(destino), DURACAO_MS / 2));
      timers.current.push(window.setTimeout(() => setVarrendo(null), DURACAO_MS + 40));
    },
    [vista, varrendo],
  );

  const lado: Lado = vista === "login" ? "direita" : "esquerda";

  const painel = (alvo: Vista) => ({
    "aria-hidden": vista !== alvo,
    "inert": vista !== alvo,
    "className": vista === alvo ? "col-start-1 row-start-1" : "col-start-1 row-start-1 invisible",
  });

  return (
    <div className="relative overflow-hidden" data-auth-blade={vista}>
      {/* Os dois painéis ocupam a MESMA célula: a altura é a do maior formulário.
          Cada um fica do lado oposto ao repouso da faixa, então nada se sobrepõe. */}
      <div className="grid">
        <div {...painel("login")}>
          <div className="flex min-h-[540px] items-center justify-start px-6 py-10 sm:px-10 md:pr-[47%]">
            <div className="w-full max-w-sm">
              <h2 className="text-2xl font-heading font-bold text-fg-primary mb-1">
                {t("loginTitle")}
              </h2>
              <p className="text-sm text-fg-secondary mb-6">
                {t("noAccount")}{" "}
                <button
                  type="button"
                  onClick={() => trocar("register")}
                  className="text-indigo hover:text-indigo-300 transition-colors"
                >
                  {t("signUp")}
                </button>
              </p>
              <SocialButtons />
              <div className="mt-6">
                <LoginForm onSwitch={() => trocar("register")} />
              </div>
            </div>
          </div>
        </div>

        <div {...painel("register")}>
          <div className="flex min-h-[540px] items-center justify-end px-6 py-10 sm:px-10 md:pl-[47%]">
            <div className="w-full max-w-sm">
              <h2 className="text-2xl font-heading font-bold text-fg-primary mb-1">
                {t("registerTitle")}
              </h2>
              <p className="text-sm text-fg-secondary mb-6">
                {t("hasAccount")}{" "}
                <button
                  type="button"
                  onClick={() => trocar("login")}
                  className="text-indigo hover:text-indigo-300 transition-colors"
                >
                  {t("loginButton")}
                </button>
              </p>
              <SocialButtons />
              <div className="mt-6">
                <RegisterForm onSwitch={() => trocar("login")} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* A faixa: retângulo inclinado que existe em repouso e viaja entre os dois lados.
          `aria-hidden` porque é decoração + texto institucional replicado nos títulos. */}
      <div
        className="auth-band pointer-events-none absolute inset-0 z-20"
        data-lado={lado}
        data-varrendo={varrendo ?? undefined}
        aria-hidden="true"
      >
        <span className="auth-band__edge auth-band__edge--trail" />
        <span className="auth-band__edge auth-band__edge--lead" />
        <div className="auth-band__inner">
          <div
            className={
              lado === "direita"
                ? "auth-band__copy absolute left-[56%] right-[6%] top-1/2 -translate-y-1/2"
                : "auth-band__copy absolute left-[6%] right-[56%] top-1/2 -translate-y-1/2"
            }
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo">
              MEDIA Rate
            </p>
            <h3 className="mt-3 text-3xl font-heading font-bold text-fg-primary">
              {vista === "login" ? t("loginSubtitle") : t("registerTitle")}
            </h3>
            <p className="mt-3 text-sm text-fg-secondary">{t("tagline")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
