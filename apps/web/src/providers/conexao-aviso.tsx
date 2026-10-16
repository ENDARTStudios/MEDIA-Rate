"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

/**
 * D-629 — aviso global de conexão (conclui as **7** sessões que registravam "sem estado offline").
 *
 * O produto nunca teve estado offline: com a rede caída, cada tela mostrava o próprio erro
 * (ou esqueleto infinito) sem dizer **por quê**. Em vez de sete correções locais, esta é **uma**
 * decisão implementada uma vez, no layout:
 *
 * - `navigator.onLine` + os eventos `online`/`offline` (a API padrão do navegador — nada de ping
 *   periódico, que gastaria rede justamente quando ela está ruim);
 * - faixa discreta no topo, `role="status"` (não interrompe leitura: não é `alert`);
 * - ao voltar, um `toast.success` confirma a reconexão e o aviso desaparece.
 *
 * Detalhe de SSR: o estado inicial é `true` (online) e só o efeito no cliente pode marcar
 * offline — assim não há divergência de hidratação (o servidor não conhece a rede do usuário).
 */
export function ConexaoAviso() {
  const t = useTranslations("common");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const atualizar = () => setOffline(!navigator.onLine);
    atualizar();
    const aoVoltar = () => {
      setOffline(false);
      toast.success(t("backOnline"));
    };
    window.addEventListener("offline", atualizar);
    window.addEventListener("online", aoVoltar);
    return () => {
      window.removeEventListener("offline", atualizar);
      window.removeEventListener("online", aoVoltar);
    };
  }, [t]);

  if (!offline) return null;

  return (
    <div
      role="status"
      data-testid="aviso-offline"
      className="sticky top-0 z-40 border-b border-score-medium/40 bg-score-medium/10 px-4 py-2 text-center text-xs text-score-medium"
    >
      {t("offline")}
    </div>
  );
}
