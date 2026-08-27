import React from "react";

export default function StartupError({ message }: { message: string }) {
  return (
    <main className="loginPage">
      <div className="loginCard">
        <div className="brandMark">⚠️</div>
        <h1>HouseEats could not start</h1>
        <p>The app failed to load. If this persists, the deployment may be misconfigured.</p>
        <div className="error" role="alert">{message}</div>
        <button className="primary" onClick={() => window.location.reload()}>Try again</button>
      </div>
    </main>
  );
}
