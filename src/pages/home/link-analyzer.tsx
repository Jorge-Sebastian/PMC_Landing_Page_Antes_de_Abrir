import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleAlert, ClipboardPaste, Info, Loader2, SearchCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageExamples } from "./message-examples";
import { buildVerdict } from "@/lib/link-analysis/build-verdict";
import { checkDestination } from "@/lib/link-analysis/check-destination";
import { normalizeInput } from "@/lib/link-analysis/normalize-input";
import type { DestinationCheck, InputErrorKey, Verdict } from "@/lib/link-analysis/types";
import { getResultPresentation } from "./result-presentation";
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
  const [exampleLoaded, setExampleLoaded] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "done" || !analysis) return;
    const frame = window.requestAnimationFrame(() => {
      const result = resultRef.current;
      if (!result) return;
      result.focus({ preventScroll: true });
      const headerHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
      const top = window.scrollY + result.getBoundingClientRect().top - headerHeight - 16;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [status, analysis]);

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
      setErrorKey(null);
      setAnalysis(null);
      setStatus("idle");
      inputRef.current?.focus();
    } catch {
      setPasteFailed(true);
      inputRef.current?.focus();
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
            getResultPresentation(analysis.verdict, analysis.destination).uncertain
              ? t("result.uncertain.title")
              : analysis.verdict.level === "riesgo"
              ? t("result.level.risk.title")
              : analysis.verdict.level === "precaucion"
                ? t("result.level.caution.title")
                : t("result.level.noSignals.title")
          }`
        : "";

  return (
    <div>
      <Card className="border-border/70 shadow-card">
        <CardContent className="p-5 pt-6 sm:p-8 sm:pt-8">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <label htmlFor="enlace" className="block text-base font-medium sm:text-lg">
                {t("analyzer.label")}
              </label>
              <div className="relative">
                <textarea
                  className={`min-h-32 w-full resize-y rounded-xl border border-input bg-card px-4 py-3 text-lg text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${CLIPBOARD_AVAILABLE ? "pr-28" : ""}`}
                  ref={inputRef}
                  id="enlace"
                  name="enlace"
                  rows={3}
                  autoComplete="off"
                  spellCheck={false}
                  enterKeyHint="search"
                  placeholder={t("analyzer.placeholder")}
                  value={value}
                  aria-describedby="analizador-ayuda"
                  aria-invalid={Boolean(errorMessage)}
                  onChange={(event) => {
                    setExampleLoaded(false);
                    setValue(event.target.value);
                    if (errorKey) setErrorKey(null);
                  }}
                />
                {CLIPBOARD_AVAILABLE ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute right-2 top-2 h-10 gap-1.5 px-2 text-base text-primary hover:bg-primary/10"
                    onClick={handlePaste}
                    disabled={status === "analyzing"}
                  >
                    <ClipboardPaste className="size-4" aria-hidden="true" />
                    {t("analyzer.pasteButton")}
                  </Button>
                ) : null}
              </div>
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
            </div>

            {pasteFailed ? (
              <p className="text-base text-muted-foreground">{t("analyzer.pasteHelp")}</p>
            ) : null}

            <p className="text-[0.95rem] text-muted-foreground">{t("analyzer.privacy")}</p>
          </form>
        </CardContent>
      </Card>

      <MessageExamples disabled={status === "analyzing"} onSelect={(message) => {
        setValue(message);
        setErrorKey(null);
        setAnalysis(null);
        setStatus("idle");
        setExampleLoaded(true);
        inputRef.current?.focus();
      }} />
      {exampleLoaded ? <p role="status" className="mt-3 text-base font-medium text-primary">{t("analyzer.exampleLoaded")}</p> : null}
      <p className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </p>

      <div ref={resultRef} tabIndex={-1} className="mt-6 rounded-xl focus-visible:ring-2 focus-visible:ring-ring">
        {status === "done" && analysis ? (
          <div>
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
