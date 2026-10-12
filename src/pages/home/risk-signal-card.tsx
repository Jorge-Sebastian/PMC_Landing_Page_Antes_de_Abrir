import { Info, TriangleAlert } from "lucide-react";

import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/link-analysis/types";

/** Tarjeta pequeña con una de las señales encontradas en el enlace. */
export const RiskSignalCard = ({ signal }: { signal: Signal }) => {
  const { t } = useTranslation();
  const isStrong = signal.weight >= 3;

  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-4 sm:p-5",
        isStrong ? "border-risk-danger/30" : "border-border/70",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg",
            isStrong
              ? "bg-risk-danger-soft text-risk-danger-foreground"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          {isStrong ? (
            <TriangleAlert className="size-5" aria-hidden="true" />
          ) : (
            <Info className="size-5" aria-hidden="true" />
          )}
        </span>
        <div className="space-y-1">
          {signal.weight === 0 ? <p className="text-sm text-muted-foreground">{t("result.noteLabel")}</p> : null}
          <p className="text-base font-semibold sm:text-lg">{signal.title}</p>
          <p className="text-base text-muted-foreground">{signal.explanation}</p>
        </div>
      </div>
    </li>
  );
};
