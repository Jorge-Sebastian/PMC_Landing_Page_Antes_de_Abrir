import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BellRing,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Info,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMonthlyPriceCOP, PRICING_PLANS, type PricingPlanId } from "./pricing-model";

const planIcons: Record<PricingPlanId, LucideIcon> = {
  free: Copy,
  automatic: BellRing,
  family: UsersRound,
};

const questions = [
  ["pricing.faq1.question", "pricing.faq1.answer"],
  ["pricing.faq2.question", "pricing.faq2.answer"],
  ["pricing.faq3.question", "pricing.faq3.answer"],
  ["pricing.faq4.question", "pricing.faq4.answer"],
] as const;

/**
 * Commercial proposal only. Do not expose payment buttons until a secure,
 * verified subscription backend and trial-enforcement flow exist.
 *
 * In the current pilot, Android is still distributed for free.
 */
export const PricingSection = () => {
  const { t } = useTranslation();

  return (
    <section id="planes" aria-labelledby="planes-title" className="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-[-14rem] size-[30rem] rounded-full bg-teal-400/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[-18rem] left-[-12rem] size-[36rem] rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="section-shell relative">
        <header className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-300/10 px-4 py-2 text-sm font-semibold text-teal-200">
            <Sparkles className="size-4" aria-hidden="true" />
            {t("pricing.eyebrow")}
          </span>
          <h2 id="planes-title" className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.7rem] lg:leading-tight">
            {t("pricing.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
            {t("pricing.subtitle")}
          </p>
          <div role="note" className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-2xl border border-slate-600/80 bg-slate-800/70 p-4 text-left text-sm leading-relaxed text-slate-200">
            <Info className="mt-0.5 size-5 shrink-0 text-teal-300" aria-hidden="true" />
            <p>{t("pricing.commercialNotice")}</p>
          </div>
        </header>

        <div className="mt-11 grid items-stretch gap-5 md:grid-cols-3">
          {PRICING_PLANS.map((plan) => {
            const Icon = planIcons[plan.id];
            const featured = plan.id === "automatic";
            const isFamily = plan.id === "family";
            return (
              <article
                key={plan.id}
                aria-label={t("pricing." + plan.id + ".name")}
                className={
                  "relative flex h-full flex-col rounded-[1.65rem] border p-6 text-slate-900 shadow-xl sm:p-7 " +
                  (featured
                    ? "border-teal-300 bg-[#f2fffd] ring-2 ring-teal-300/80 md:-translate-y-2"
                    : isFamily
                      ? "border-slate-200 bg-white"
                      : "border-slate-200 bg-white/95")
                }
              >
                {featured ? (
                  <span className="absolute -top-4 left-6 rounded-full bg-teal-600 px-4 py-1.5 text-xs font-bold tracking-wide text-white shadow-md">
                    {t("pricing.recommended")}
                  </span>
                ) : null}

                <div className="flex items-center justify-between gap-3">
                  <span className={
                    "flex size-12 items-center justify-center rounded-2xl " +
                    (featured ? "bg-teal-100 text-teal-800" : isFamily ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700")
                  }>
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <span className={
                    "rounded-full px-3 py-1 text-xs font-semibold " +
                    (plan.availability === "available"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-900")
                  }>
                    {plan.availability === "available" ? t("pricing.available") : t("pricing.comingSoon")}
                  </span>
                </div>

                <div className="mt-6">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {t("pricing." + plan.id + ".name")}
                  </h3>
                  <p className="mt-2 min-h-[4rem] text-sm leading-relaxed text-slate-600">
                    {t("pricing." + plan.id + ".description")}
                  </p>
                </div>

                <div className="mt-4 border-b border-slate-200 pb-6">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[2.55rem] font-extrabold leading-none tracking-tight">
                      {formatMonthlyPriceCOP(plan.monthlyCOP)}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      {plan.monthlyCOP === 0 ? t("pricing.forever") : t("pricing.perMonth")}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    {plan.id === "family"
                      ? t("pricing.familyLimit", { count: plan.members })
                      : plan.id === "automatic"
                        ? t("pricing.individual")
                        : t("pricing.web")}
                  </p>
                  {plan.trialDays > 0 ? (
                    <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">
                      <Clock3 className="size-4" aria-hidden="true" />
                      {t("pricing.trial", { count: plan.trialDays })}
                    </p>
                  ) : null}
                </div>

                <p className="mt-6 text-sm font-bold text-slate-900">{t("pricing.includes")}</p>
                <ul className="mt-4 flex-1 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800">
                        <Check className="size-3.5" aria-hidden="true" />
                      </span>
                      <span>{t(feature)}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={featured ? "hero" : "outline"}
                  size="xl"
                  className="mt-8 h-auto min-h-14 w-full whitespace-normal px-4 py-3 text-center"
                >
                  <a href={plan.destination}>
                    {t("pricing." + plan.id + ".action")}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </a>
                </Button>
                <p className="mt-3 min-h-10 text-center text-xs leading-relaxed text-slate-500">
                  {t("pricing." + plan.id + ".footnote")}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mx-auto mt-8 flex max-w-4xl items-start gap-3 rounded-2xl border border-amber-300/25 bg-amber-200/10 px-5 py-4 text-sm leading-relaxed text-slate-200">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-200" aria-hidden="true" />
          <p>{t("pricing.pilotNotice")}</p>
        </div>

        <div id="familia-beneficios" className="mt-16 grid gap-8 rounded-[1.75rem] border border-slate-600/70 bg-white/5 p-6 sm:p-9 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-bold tracking-wide text-teal-200">
              <UsersRound className="size-5" aria-hidden="true" />
              {t("pricing.familyEyebrow")}
            </span>
            <h3 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
              {t("pricing.familyTitle")}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              {t("pricing.familyBody")}
            </p>
            <a href="#android" className="mt-5 inline-flex items-center gap-2 font-semibold text-teal-200 underline-offset-4 transition-colors hover:text-white hover:underline">
              {t("pricing.familyCta")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex gap-3 rounded-xl border border-slate-600/70 bg-slate-900/80 p-4">
              <Smartphone className="mt-1 size-5 shrink-0 text-teal-300" aria-hidden="true" />
              <div>
                <p className="font-semibold">{t("pricing.familyStep1.title")}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{t("pricing.familyStep1.body")}</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-slate-600/70 bg-slate-900/80 p-4">
              <BellRing className="mt-1 size-5 shrink-0 text-teal-300" aria-hidden="true" />
              <div>
                <p className="font-semibold">{t("pricing.familyStep2.title")}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{t("pricing.familyStep2.body")}</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-slate-600/70 bg-slate-900/80 p-4">
              <LockKeyhole className="mt-1 size-5 shrink-0 text-teal-300" aria-hidden="true" />
              <div>
                <p className="font-semibold">{t("pricing.familyStep3.title")}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{t("pricing.familyStep3.body")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          <h3 className="text-center text-2xl font-bold text-white sm:text-3xl">
            {t("pricing.faqTitle")}
          </h3>
          <div className="mt-6 divide-y divide-slate-700 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80">
            {questions.map(([question, answer]) => (
              <details key={question} className="group px-5 py-4 sm:px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-semibold text-white marker:hidden">
                  <span>{t(question)}</span>
                  <ChevronDown className="size-5 shrink-0 text-teal-300 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">{t(answer)}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
