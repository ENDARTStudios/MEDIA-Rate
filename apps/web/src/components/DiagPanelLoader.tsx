"use client";

import { useState, useEffect, type JSX } from "react";
import { ErrorBoundarySilent } from "./ErrorBoundarySilent";
import { DiagPanel } from "./DiagPanel";

export function DiagPanelLoader(): JSX.Element | null {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <ErrorBoundarySilent>
      <DiagPanel />
    </ErrorBoundarySilent>
  );
}
