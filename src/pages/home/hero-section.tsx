import { useTranslation } from "react-i18next";
import { BadgeCheck } from "lucide-react";

import { LinkAnalyzer } from "./link-analyzer";

/** Primera pantalla: la herramienta es la protagonista, no el texto. */
export const HeroSection = () => {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-[-15%] size-[26rem] rounded-full bg-primary/5 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-12rem] left-[-12%] size-[22rem] rounded-full bg-accent/70 blur-3xl"
      />

      <div className="section-shell relative pb-14 pt-10 sm:pb-20 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow">
            <BadgeCheck className="size-5" aria-hidden="true" />
            {t("hero.badge")}
          </span>
          <h1 className="mt-6 text-3xl leading-tight sm:text-4xl lg:text-5xl">{t("hero.title")}</h1>
          <p className="mt-5 text-lg text-muted-foreground sm:text-xl">{t("hero.subtitle")}</p>
        </div>

        <div className="mx-auto mt-9 max-w-3xl sm:mt-12">
          <LinkAnalyzer />
        </div>
      </div>
    </section>
  );
};
