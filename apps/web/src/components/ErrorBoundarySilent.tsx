"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundarySilent extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (typeof console !== "undefined") {
      console.error("[DiagPanelSafe] crashed silently:", error.message, info.componentStack?.substring(0, 200));
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
