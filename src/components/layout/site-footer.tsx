import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { BrandMark } from "@/components/layout/brand-mark";

export const SiteFooter = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-6 border-t border-border/70 bg-secondary/40">
      <div className="section-shell grid gap-10 py-12 sm:grid-cols-2 sm:py-14">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span className="text-lg font-semibold tracking-tight sm:text-xl">
              {t("common.appName")}
            </span>
          </div>
          <p className="max-w-sm text-base text-muted-foreground">{t("footer.tagline")}</p>
        </div>

        <nav className="flex flex-col gap-3" aria-label={t("common.appName")}>
          <a
            href="/#como-funciona"
            className="w-fit text-base text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("nav.howItWorks")}
          </a>
          <a
            href="/#consejos"
            className="w-fit text-base text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("nav.tips")}
          </a>
          <Link
            to="/privacidad"
            className="w-fit text-base text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("footer.privacy")}
          </Link>
          <Link
            to="/contacto"
            className="w-fit text-base text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("footer.contact")}
          </Link>
        </nav>
      </div>

      <div className="section-shell flex flex-col gap-2 border-t border-border/70 py-6 text-[0.95rem] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{t("footer.note")}</p>
        <p>
          {t("common.appName")} · {year}
        </p>
      </div>
    </footer>
  );
};
