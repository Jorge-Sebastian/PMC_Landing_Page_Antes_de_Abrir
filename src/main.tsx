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

bootstrapGeneratedSiteAnalytics();

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(container).render(
  clerkKey ? <ClerkProvider publishableKey={clerkKey} localization={esES} afterSignOutUrl="/"><App /></ClerkProvider> : <App />,
);
