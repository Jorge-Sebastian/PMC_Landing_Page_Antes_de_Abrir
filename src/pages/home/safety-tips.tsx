import { useTranslation } from "react-i18next";
import { ArrowRight, AlarmClock, Globe, HelpCircle, KeyRound, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

import { SectionHeading } from "./section-heading";
import { IconCard } from "./icon-card";

export const SafetyTips = () => {
  const { t } = useTranslation();

  return (
    <section id="consejos" className="section-shell py-14 sm:py-20">
      <SectionHeading title={t("tips.title")} subtitle={t("tips.subtitle")} />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <IconCard
          icon={AlarmClock}
          title={t("tips.item1.title")}
          body={t("tips.item1.body")}
        />
        <IconCard
          icon={UserCheck}
          title={t("tips.item2.title")}
          body={t("tips.item2.body")}
        />
        <IconCard
          icon={KeyRound}
          title={t("tips.item3.title")}
          body={t("tips.item3.body")}
        />
        <IconCard icon={Globe} title={t("tips.item4.title")} body={t("tips.item4.body")} />
        <IconCard
          icon={HelpCircle}
          title={t("tips.item5.title")}
          body={t("tips.item5.body")}
        />
      </div>
      <div className="mt-8 flex justify-center">
        <Button asChild variant="hero" size="xl" className="w-full sm:w-auto">
          <a href="#analizador">{t("nav.analyze")}<ArrowRight aria-hidden="true" /></a>
        </Button>
      </div>
    </section>
  );
};
