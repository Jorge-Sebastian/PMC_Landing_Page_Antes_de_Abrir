import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { AuthControls } from "@/components/auth/auth-controls";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";

/**
 * Cabecera sin menú desplegable: en el móvil solo el nombre y el acceso directo
 * a la herramienta, para que nunca haya funciones escondidas.
 */
export const SiteHeader = () => {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="section-shell flex flex-wrap items-center justify-between gap-3 py-3 md:h-20 md:flex-nowrap md:py-0">
        <Link
          to="/"
          className="mx-auto flex shrink-0 items-center gap-2 rounded-xl md:mx-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <BrandMark />
          <span className="text-lg font-bold tracking-tight min-[400px]:text-xl sm:text-3xl">
            {t("common.appName")}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label={t("common.appName")}>
          <a
            href="/#como-funciona"
            className="rounded-lg px-3 py-2 text-base text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {t("nav.howItWorks")}
          </a>
          <a
            href="/#consejos"
            className="rounded-lg px-3 py-2 text-base text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {t("nav.tips")}
          </a>
        </nav>

        <div className="flex w-full min-w-0 items-center gap-2 [&>button]:min-w-0 [&>button]:flex-1 md:w-auto md:shrink-0 md:gap-3 md:[&>button]:flex-none">
        <AuthControls />
        <a href="/#planes" className="shrink-0 rounded-lg px-2 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/10 sm:px-4 sm:text-base">{t("nav.plans")}</a>
        <Button asChild variant="hero" size="xl" className="min-w-0 flex-1 px-3 sm:px-6 md:flex-none">
          <a href="/#analizador">
            <span className="sm:hidden">{t("nav.analyzeShort")}</span>
            <span className="hidden sm:inline">{t("nav.analyze")}</span>
            <ArrowRight className="hidden sm:block" aria-hidden="true" />
          </a>
        </Button>
        </div>
      </div>
    </header>
  );
};
