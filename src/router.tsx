import { lazy, Suspense, type ReactNode } from "react";
import Home from "./pages/home";

// Route-level code splitting: initial mobile visits don't download Family,
// administrator, privacy and contact pages until someone opens them.
const ContactPage = lazy(() => import("./pages/contacto"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPage = lazy(() => import("./pages/privacidad"));
const AdminPage = lazy(() => import("./pages/admin"));
const FamilyPage = lazy(() => import("./pages/familia"));

function DeferredRoute({children}:{children: ReactNode}) {
  return <Suspense fallback={<main className="section-shell py-10" role="status">Cargando SmartGuard…</main>}>{children}</Suspense>;
}

export const routers = [
  {
    path: "/",
    name: "home",
    element: <Home />,
  },
  {
    path: "/privacidad",
    name: "privacy",
    element: <DeferredRoute><PrivacyPage /></DeferredRoute>,
  },
  {
    path: "/contacto",
    name: "contact",
    element: <DeferredRoute><ContactPage /></DeferredRoute>,
  },
  {
    path: "/administrador",
    name: "administrator",
    element: <DeferredRoute><AdminPage /></DeferredRoute>,
  },
  { path: "/familia", name: "family", element: <DeferredRoute><FamilyPage /></DeferredRoute> },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    name: "404",
    element: <DeferredRoute><NotFound /></DeferredRoute>,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
