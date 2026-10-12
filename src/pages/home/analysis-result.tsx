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
import { getDestinationStatus } from "@/lib/link-analysis/types";
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
            explanation: verdict.signals.some((signal) => signal.weight > 0)
              ? t("result.level.noSignals.withDetails")
              : t("result.level.noSignals.explanation"),
            recommendation: t("result.recommendation.noSignals"),
          };

  const destinationStatus = getDestinationStatus(destination);
  const incomplete = destinationStatus.kind !== "checked" || destination.looksLikeJsShell === true;
  const riskSignals = verdict.signals.filter((signal) => signal.weight > 0);
  const notes = verdict.signals.filter((signal) => signal.weight === 0);

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
              <p className="text-lg">{incomplete ? t("result.incomplete.explanation") : copy.explanation}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {incomplete ? (
            <div role="note" className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-lg font-semibold">{t("result.incomplete")}</h3>
              <p className="mt-2">{destination.looksLikeJsShell
                ? t("result.destination.jsShell")
                : destinationStatus.kind === "unchecked" && destinationStatus.reason === "unavailable"
                    ? t("result.destination.unavailable")
                    : t("result.destination.unverified")}</p>
            </div>
          ) : null}
          {verdict.officialMatch ? (
            <div role="note" className="rounded-xl border border-border bg-secondary p-5 text-secondary-foreground">
              <p className="font-semibold">{t("result.official", { brandName: verdict.officialMatch.brandName })}</p>
              <p className="mt-2">{t("result.official.note")}</p>
            </div>
          ) : null}
          <div className={cn("rounded-xl border p-5", styles.inner)}>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <ListChecks className="size-5 shrink-0" aria-hidden="true" />
              {t("result.recommendationTitle")}
            </h3>
            <p className="mt-2 text-base sm:text-lg">{copy.recommendation}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold sm:text-xl">{t("result.signalsTitle")}</h3>
            {riskSignals.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {riskSignals.map((signal, index) => (
                  <RiskSignalCard key={`${signal.id}-${index}`} signal={signal} />
                ))}
              </ul>
            ) : (
              <p className="text-base text-muted-foreground">{t("result.signals.none")}</p>
            )}
          </div>

          {notes.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t("result.notesTitle")}</h3>
              <ul className="grid gap-3 sm:grid-cols-2">{notes.map((signal) => <RiskSignalCard key={signal.id} signal={signal} />)}</ul>
            </div>
          ) : null}
          <div className="rounded-xl border border-border/70 bg-card p-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Route className="size-5 shrink-0 text-primary" aria-hidden="true" />
              {t("result.destinationTitle")}
            </h3>

            {destinationStatus.kind === "checked" ? (
              <dl className="mt-4 space-y-3">
                {typeof destination.status === "number" && destination.status > 0 ? (
                  <div className="space-y-1 border-b border-border/60 pb-3">
                    <dt className="text-muted-foreground">{t("result.destination.http")}</dt>
                    <dd><span className="font-medium">{destination.status}</span><p className="text-sm text-muted-foreground">{t("result.destination.http.note")}</p></dd>
                  </div>
                ) : null}
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
                  : destinationStatus.kind === "unchecked" && destinationStatus.reason === "unavailable"
                    ? t("result.destination.unavailable")
                    : t("result.destination.unverified")}
              </p>
            )}

            {destination.differentHost ? <p className="mt-4 text-base text-muted-foreground">{t("result.destination.changed")}</p> : null}
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
