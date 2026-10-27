import { ArrowRight, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

/** La revisión web y la descarga tienen destinos y jerarquías distintos. */
export const AnalysisActions = () => {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-stretch gap-3">
      <Button asChild variant="hero" size="xl">
        <a href="#analizador">{t("nav.analyze")}<ArrowRight aria-hidden="true" /></a>
      </Button>
      <Button asChild variant="outline" size="xl" className="h-auto min-h-12 whitespace-normal px-4 py-3 text-center">
        <a href="#android"><Smartphone aria-hidden="true" className="shrink-0" />{t("android.cta")}</a>
      </Button>
    </div>
  );
};
