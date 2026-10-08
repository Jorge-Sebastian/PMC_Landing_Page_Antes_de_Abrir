import { useTranslation } from "react-i18next";
import { Info, ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/** Transparencia: qué hace la herramienta y qué no promete. */
export const TrustNotice = () => {
  const { t } = useTranslation();

  return (
    <section className="section-shell pb-16 sm:pb-20">
      <Card className="border-primary/20 bg-gradient-panel shadow-card">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <h2 className="flex items-center gap-3 text-2xl sm:text-3xl">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </span>
            {t("trust.title")}
          </h2>

          <p className="text-lg">{t("trust.body1")}</p>
          <p className="text-lg font-medium">{t("trust.body2")}</p>

          <p className="flex items-start gap-2 rounded-xl bg-secondary/70 px-4 py-3 text-base text-secondary-foreground">
            <Info className="mt-1 size-5 shrink-0" aria-hidden="true" />
            {t("trust.notice")}
          </p>
        </CardContent>
      </Card>
    </section>
  );
};
