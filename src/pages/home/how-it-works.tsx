import { useTranslation } from "react-i18next";
import { CircleCheckBig, ClipboardCopy, SearchCheck } from "lucide-react";

import { SectionHeading } from "./section-heading";
import { StepCard } from "./step-card";

export const HowItWorks = () => {
  const { t } = useTranslation();

  return (
    <section id="como-funciona" className="section-shell py-14 sm:py-20">
      <SectionHeading title={t("howItWorks.title")} subtitle={t("howItWorks.subtitle")} />

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <StepCard
          step={1}
          icon={ClipboardCopy}
          label={t("howItWorks.stepLabel", { number: 1 })}
          title={t("howItWorks.step1.title")}
          body={t("howItWorks.step1.body")}
        />
        <StepCard
          step={2}
          icon={SearchCheck}
          label={t("howItWorks.stepLabel", { number: 2 })}
          title={t("howItWorks.step2.title")}
          body={t("howItWorks.step2.body")}
        />
        <StepCard
          step={3}
          icon={CircleCheckBig}
          label={t("howItWorks.stepLabel", { number: 3 })}
          title={t("howItWorks.step3.title")}
          body={t("howItWorks.step3.body")}
        />
      </div>
    </section>
  );
};
