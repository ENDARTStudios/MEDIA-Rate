"use client";

import { ErrorBoundarySilent } from "./ErrorBoundarySilent";
import { DiagPanel } from "./DiagPanel";

export function DiagPanelSafe() {
  return (
    <ErrorBoundarySilent>
      <DiagPanel />
    </ErrorBoundarySilent>
  );
}
