import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "react-router-dom";
import { ArrowLeft, SearchX } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center bg-gradient-hero px-5 py-16">
        <div className="w-full max-w-xl rounded-2xl border border-border/70 bg-card p-8 text-center shadow-card">
          <span className="mx-auto flex size-14 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <SearchX className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-3xl">{t("notFound.title")}</h1>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 text-base font-medium text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            {t("notFound.actions.backHome")}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default NotFound;
