import { ClerkProvider } from "@clerk/react";
import { esES } from "@clerk/localizations";
import { createRoot } from "react-dom/client";
import "./i18n/config";
import { bootstrapGeneratedSiteAnalytics } from "./analytics.ts";
import App from "./App.tsx";
import "./index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container #root was not found.");
}

// Invitation secrets must never be sent to analytics as part of a page URL.
if (window.location.pathname === "/familia") {
  const current = new URL(window.location.href);
  const fragment = new URLSearchParams(current.hash.replace(/^#/, ""));
  const invite = fragment.get("invitacion") || current.searchParams.get("invitacion");
  if (invite && invite.length <= 256) {
    try { window.sessionStorage.setItem("smartguard-family-pending-invite", invite); }
    catch { /* Login can still proceed if browser storage is blocked. */ }
    current.searchParams.delete("invitacion");
    if (current.hash.startsWith("#invitacion=")) current.hash = "";
    window.history.replaceState(window.history.state, "", current.pathname + current.search + current.hash);
  }
}

bootstrapGeneratedSiteAnalytics();

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(container).render(
  clerkKey ? <ClerkProvider publishableKey={clerkKey} localization={esES} afterSignOutUrl="/"><App /></ClerkProvider> : <App />,
);
