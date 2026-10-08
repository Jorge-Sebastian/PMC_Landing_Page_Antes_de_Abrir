import { useTranslation } from "react-i18next";
import {
  CircleCheckBig,
  Info,
  KeyRound,
  ListChecks,
  RotateCcw,
  Route,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isIpHost } from "@/lib/link-analysis/analyze-url";
import type { DestinationCheck, RiskLevel, Verdict } from "@/lib/link-analysis/types";
import { RiskSignalCard } from "./risk-signal-card";

type LevelStyle = {
  icon: LucideIcon;
  wrapper: string;
  inner: string;
  badge: string;
  iconBox: string;
};

const LEVEL_STYLES: Record<RiskLevel, LevelStyle> = {
  riesgo: {
    icon: ShieldAlert,
    wrapper: "border-risk-danger/35 bg-risk-danger-soft",
    inner: "border-risk-danger/25 bg-card/80",
    badge: "bg-risk-danger text-background",
    iconBox: "bg-risk-danger text-background",
  },
  precaucion: {
    icon: TriangleAlert,
    wrapper: "border-risk-caution/35 bg-risk-caution-soft",
    inner: "border-risk-caution/25 bg-card/80",
    badge: "bg-risk-caution text-background",
    iconBox: "bg-risk-caution text-background",
  },
  "sin-senales": {
    icon: CircleCheckBig,
    wrapper: "border-risk-safe/35 bg-risk-safe-soft",
    inner: "border-risk-safe/25 bg-card/80",
    badge: "bg-risk-safe text-background",
    iconBox: "bg-risk-safe text-background",
  },
};

const hostnameOf = (value: string) => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
};

type AnalysisResultProps = {
  url: string;
  verdict: Verdict;
  destination: DestinationCheck;
  onRestart: () => void;
};

export const AnalysisResult = ({ url, verdict, destination, onRestart }: AnalysisResultProps) => {
  const { t } = useTranslation();
  const styles = LEVEL_STYLES[verdict.level];
  const LevelIcon = styles.icon;

  // Los tres niveles se enumeran de forma explícita para que las claves de
  // traducción sean siempre literales.
  const copy =
    verdict.level === "riesgo"
      ? {
          title: t("result.level.risk.title"),
          explanation: t("result.level.risk.explanation"),
          recommendation: t("result.recommendation.risk"),
        }
      : verdict.level === "precaucion"
        ? {
            title: t("result.level.caution.title"),
            explanation: t("result.level.caution.explanation"),
            recommendation: t("result.recommendation.caution"),
          }
        : {
            title: t("result.level.noSignals.title"),
            explanation: t("result.level.noSignals.explanation"),
            recommendation: t("result.recommendation.noSignals"),
          };

  const numericHost = isIpHost(hostnameOf(url));

  return (
    <section aria-labelledby="titulo-resultado" className="space-y-6">
      <Card className={cn("border-2 shadow-card", styles.wrapper)}>
        <CardHeader className="gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[0.95rem] font-semibold",
                styles.badge,
              )}
            >
              <LevelIcon className="size-4" aria-hidden="true" />
              {t("result.heading")}
            </span>
          </div>

          <div className="flex items-start gap-4">
            <span
              className={cn(
                "hidden size-12 shrink-0 items-center justify-center rounded-xl sm:flex",
                styles.iconBox,
              )}
            >
              <LevelIcon className="size-6" aria-hidden="true" />
            </span>
            <div className="space-y-3">
              <h2
                id="titulo-resultado"
                tabIndex={-1}
                className="text-2xl leading-tight outline-none sm:text-3xl"
              >
                {copy.title}
              </h2>
              <p className="text-lg">{copy.explanation}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className={cn("rounded-xl border p-5", styles.inner)}>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <ListChecks className="size-5 shrink-0" aria-hidden="true" />
              {t("result.recommendationTitle")}
            </h3>
            <p className="mt-2 text-base sm:text-lg">{copy.recommendation}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold sm:text-xl">{t("result.signalsTitle")}</h3>
            {verdict.signals.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {verdict.signals.map((signal, index) => (
                  <RiskSignalCard key={`${signal.id}-${index}`} signal={signal} />
                ))}
              </ul>
            ) : (
              <p className="text-base text-muted-foreground">{t("result.signals.none")}</p>
            )}
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Route className="size-5 shrink-0 text-primary" aria-hidden="true" />
              {t("result.destinationTitle")}
            </h3>

            {destination.checked ? (
              <dl className="mt-4 space-y-3">
                <div className="space-y-1 border-b border-border/60 pb-3">
                  <dt className="text-[0.95rem] text-muted-foreground">
                    {t("result.destination.written")}
                  </dt>
                  <dd className="break-all text-base font-medium sm:text-lg">{url}</dd>
                </div>
                <div className="space-y-1 border-b border-border/60 pb-3">
                  <dt className="text-[0.95rem] text-muted-foreground">
                    {t("result.destination.final")}
                  </dt>
                  <dd className="break-all text-base font-medium sm:text-lg">
                    {destination.finalHost || destination.finalUrl}
                  </dd>
                </div>
                {destination.redirects && destination.redirects.length > 0 ? (
                  <div className="space-y-1">
                    <dt className="text-[0.95rem] text-muted-foreground">
                      {t("result.destination.redirects")}
                    </dt>
                    <dd className="break-all text-base font-medium">{destination.redirects.length}</dd>
                  </div>
                ) : null}
                {destination.title ? (
                  <div className="space-y-1 border-t border-border/60 pt-3">
                    <dt className="text-[0.95rem] text-muted-foreground">
                      {t("result.destination.pageTitle")}
                    </dt>
                    <dd className="text-base font-medium sm:text-lg">{destination.title}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="mt-3 flex items-start gap-2 text-base text-muted-foreground">
                <Info className="mt-1 size-5 shrink-0" aria-hidden="true" />
                {numericHost
                  ? t("result.destination.unverifiedNumeric")
                  : t("result.destination.unverified")}
              </p>
            )}

            {destination.checked && destination.hasPasswordField ? (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-risk-caution-soft px-4 py-3 text-base text-risk-caution-foreground">
                <KeyRound className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                {t("result.destination.password")}
              </p>
            ) : null}
          </div>

          <p className="flex items-start gap-2 rounded-xl bg-secondary/70 px-4 py-3 text-base text-secondary-foreground">
            <Info className="mt-1 size-5 shrink-0" aria-hidden="true" />
            {t("result.disclaimer")}
          </p>

          <Button type="button" variant="soft" size="xl" className="w-full sm:w-auto" onClick={onRestart}>
            <RotateCcw aria-hidden="true" />
            {t("result.again")}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
};
