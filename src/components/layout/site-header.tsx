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
      <div className="section-shell flex h-[4.5rem] items-center justify-between gap-2 sm:h-20">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <BrandMark className="hidden min-[400px]:block" />
          <span className="text-lg font-bold tracking-tight min-[400px]:text-xl sm:text-3xl">
            {t("common.appName")}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t("common.appName")}>
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

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <AuthControls />
        <Button asChild variant="hero" size="xl" className="px-3 sm:px-6">
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
