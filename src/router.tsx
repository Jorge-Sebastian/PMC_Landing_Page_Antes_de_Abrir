import Home from "./pages/home";
import ContactPage from "./pages/contacto";
import NotFound from "./pages/NotFound";
import PrivacyPage from "./pages/privacidad";

export const routers = [
  {
    path: "/",
    name: "home",
    element: <Home />,
  },
  {
    path: "/privacidad",
    name: "privacy",
    element: <PrivacyPage />,
  },
  {
    path: "/contacto",
    name: "contact",
    element: <ContactPage />,
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    name: "404",
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
