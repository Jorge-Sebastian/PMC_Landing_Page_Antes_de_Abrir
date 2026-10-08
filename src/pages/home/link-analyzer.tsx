import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleAlert, ClipboardPaste, Info, Loader2, SearchCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildVerdict } from "@/lib/link-analysis/build-verdict";
import { checkDestination } from "@/lib/link-analysis/check-destination";
import { normalizeInput } from "@/lib/link-analysis/normalize-input";
import type { DestinationCheck, InputErrorKey, Verdict } from "@/lib/link-analysis/types";
import { AnalysisResult } from "./analysis-result";

type AnalysisState = {
  url: string;
  verdict: Verdict;
  destination: DestinationCheck;
};

const CLIPBOARD_AVAILABLE =
  typeof navigator !== "undefined" && Boolean(navigator.clipboard?.readText);

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Herramienta principal: pegar, analizar y entender el resultado en una sola
 * pantalla, sin registros ni pasos intermedios.
 */
export const LinkAnalyzer = () => {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [errorKey, setErrorKey] = useState<InputErrorKey | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "done">("idle");
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [pasteFailed, setPasteFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const errorMessage =
    errorKey === "empty"
      ? t("analyzer.error.empty")
      : errorKey === "noLink"
        ? t("analyzer.error.noLink")
        : errorKey === "scheme"
          ? t("analyzer.error.scheme")
          : errorKey === "tooLong"
            ? t("analyzer.error.tooLong")
            : null;

  const runAnalysis = useCallback(async (raw: string) => {
    const normalized = normalizeInput(raw);
    if (normalized.ok === false) {
      setErrorKey(normalized.errorKey);
      setAnalysis(null);
      setStatus("idle");
      inputRef.current?.focus();
      return;
    }

    setErrorKey(null);
    setAnalysis(null);
    setStatus("analyzing");

    // La comprobación del destino puede tardar: se espera, pero con un mínimo
    // para que el cambio de estado no parpadee.
    const [destination] = await Promise.all([
      checkDestination(normalized.url),
      delay(400),
    ]);

    setAnalysis({
      url: normalized.url,
      verdict: buildVerdict(normalized.url, destination),
      destination,
    });
    setStatus("done");
    window.requestAnimationFrame(() => resultRef.current?.focus());
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAnalysis(value);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setPasteFailed(true);
        return;
      }
      setPasteFailed(false);
      setValue(text);
      await runAnalysis(text);
    } catch {
      setPasteFailed(true);
    }
  };

  const handleRestart = () => {
    setValue("");
    setErrorKey(null);
    setAnalysis(null);
    setStatus("idle");
    inputRef.current?.focus();
  };

  const liveMessage =
    status === "analyzing"
      ? t("analyzer.analyzing")
      : status === "done" && analysis
        ? `${t("result.heading")}: ${
            analysis.verdict.level === "riesgo"
              ? t("result.level.risk.title")
              : analysis.verdict.level === "precaucion"
                ? t("result.level.caution.title")
                : t("result.level.noSignals.title")
          }`
        : "";

  return (
    <div id="analizador">
      <Card className="border-border/70 shadow-card">
        <CardContent className="p-5 pt-6 sm:p-8 sm:pt-8">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <label htmlFor="enlace" className="block text-base font-medium sm:text-lg">
                {t("analyzer.label")}
              </label>
              <Input
                ref={inputRef}
                id="enlace"
                name="enlace"
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
                placeholder={t("analyzer.placeholder")}
                value={value}
                aria-describedby="analizador-ayuda"
                aria-invalid={Boolean(errorMessage)}
                onChange={(event) => {
                  setValue(event.target.value);
                  if (errorKey) setErrorKey(null);
                }}
              />
            </div>

            {errorMessage ? (
              <p role="alert" className="flex items-start gap-2 text-base font-medium text-destructive">
                <CircleAlert className="mt-1 size-5 shrink-0" aria-hidden="true" />
                {errorMessage}
              </p>
            ) : null}

            <p id="analizador-ayuda" className="flex items-start gap-2 text-base text-muted-foreground">
              <Info className="mt-1 size-5 shrink-0" aria-hidden="true" />
              {t("analyzer.hint")}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="submit"
                variant="hero"
                size="xl"
                className="w-full sm:flex-1"
                disabled={status === "analyzing"}
              >
                {status === "analyzing" ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <SearchCheck aria-hidden="true" />
                )}
                {status === "analyzing" ? t("analyzer.analyzing") : t("analyzer.submit")}
              </Button>

              {CLIPBOARD_AVAILABLE ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xl"
                  className="w-full sm:w-auto"
                  onClick={handlePaste}
                >
                  <ClipboardPaste aria-hidden="true" />
                  {t("analyzer.pasteButton")}
                </Button>
              ) : null}
            </div>

            {pasteFailed ? (
              <p className="text-base text-muted-foreground">{t("analyzer.pasteHelp")}</p>
            ) : null}

            <p className="text-[0.95rem] text-muted-foreground">{t("analyzer.privacy")}</p>
          </form>
        </CardContent>
      </Card>

      <p className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </p>

      <div ref={resultRef} tabIndex={-1} className="outline-none">
        {status === "done" && analysis ? (
          <div className="mt-6 animate-fade-up">
            <AnalysisResult
              url={analysis.url}
              verdict={analysis.verdict}
              destination={analysis.destination}
              onRestart={handleRestart}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};
