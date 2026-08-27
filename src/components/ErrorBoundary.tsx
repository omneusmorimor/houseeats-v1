import React from "react";
import { errorMessage } from "../lib/errors";

type Props = { children: React.ReactNode };
type State = { message: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return { message: errorMessage(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[houseeats] render failed:", error, info.componentStack);
  }

  render() {
    if (!this.state.message) return this.props.children;
    return (
      <main className="loginPage">
        <div className="loginCard">
          <div className="brandMark">⚠️</div>
          <h1>Something broke</h1>
          <p>HouseEats hit an unexpected error and could not finish loading this screen.</p>
          <div className="error" role="alert">{this.state.message}</div>
          <button className="primary" onClick={() => window.location.reload()}>Reload HouseEats</button>
        </div>
      </main>
    );
  }
}
