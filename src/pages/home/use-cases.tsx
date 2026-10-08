import { useTranslation } from "react-i18next";
import { Instagram, Landmark, LogIn, MessageSquareText, Truck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "./section-heading";

type UseCaseProps = {
  icon: typeof Landmark;
  text: string;
};

const UseCaseCard = ({ icon: Icon, text }: UseCaseProps) => (
  <Card className="h-full border-border/70 shadow-soft">
    <CardContent className="flex items-start gap-3 p-5 pt-5 sm:p-6 sm:pt-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="text-base sm:text-lg">{text}</p>
    </CardContent>
  </Card>
);

export const UseCases = () => {
  const { t } = useTranslation();

  return (
    <section className="bg-secondary/40 py-14 sm:py-20">
      <div className="section-shell">
        <SectionHeading title={t("useCases.title")} subtitle={t("useCases.subtitle")} />

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <UseCaseCard icon={Landmark} text={t("useCases.item1")} />
          <UseCaseCard icon={Truck} text={t("useCases.item2")} />
          <UseCaseCard icon={MessageSquareText} text={t("useCases.item3")} />
          <UseCaseCard icon={Instagram} text={t("useCases.item4")} />
        </div>

        <p className="mx-auto mt-8 flex max-w-3xl items-start justify-center gap-2 text-center text-base text-muted-foreground">
          <LogIn className="mt-1 size-5 shrink-0" aria-hidden="true" />
          {t("useCases.footnote")}
        </p>
      </div>
    </section>
  );
};
