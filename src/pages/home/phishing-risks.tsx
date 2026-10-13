import { useTranslation } from "react-i18next";
import { ContactRound, KeyRound, Wallet } from "lucide-react";

import { IconCard } from "./icon-card";
import { SectionHeading } from "./section-heading";

export const PhishingRisks = () => {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="riesgos-phishing" className="bg-secondary/40">
      <div className="section-shell py-14 sm:py-20">
        <SectionHeading
          titleId="riesgos-phishing"
          title={t("phishingRisks.title")}
          subtitle={t("phishingRisks.subtitle")}
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <IconCard icon={ContactRound} title={t("phishingRisks.data.title")} body={t("phishingRisks.data.body")} />
          <IconCard icon={KeyRound} title={t("phishingRisks.accounts.title")} body={t("phishingRisks.accounts.body")} />
          <IconCard icon={Wallet} title={t("phishingRisks.money.title")} body={t("phishingRisks.money.body")} />
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-center text-base text-muted-foreground">{t("phishingRisks.note")}</p>
      </div>
    </section>
  );
};
