import "./index.css";
import "./mobile-calendar.css";
import "./member-week.css";
import "./houseeats-polish.css";
import "./menu.css";
import "./chef-polish.css";
import "./chef-responsive.css";
import "./chef-mobile-final.css";
import "./chef-launch-polish.css";
import "./monthly-print-calendar.css";
import "./member-navigation.css";
import "./tasteful-traditions-brand.css";
import "./member-chef-theme.css";
import "./chef-warm-source.css";
import React from "react";
import ReactDOM from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary";
import StartupError from "./components/StartupError";
import { reportError } from "./lib/errors";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('HouseEats could not start: no element with id "root" was found.');
}

const root = ReactDOM.createRoot(rootElement);

import("./App").then(
  ({ default: App }) =>
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    ),
  (error: unknown) => root.render(<StartupError message={reportError("startup failed", error)} />)
);
