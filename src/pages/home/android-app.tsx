import { BellRing, Download, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export const AndroidApp = () => {
  const { t } = useTranslation();
  return (
    <section id="android" aria-labelledby="android-title" className="bg-slate-900 text-white">
      <div className="section-shell grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr]">
        <div className="max-w-xl">
          <p className="mb-4 flex items-center gap-2 font-semibold text-teal-300"><Smartphone aria-hidden="true" className="h-5 w-5" />{t("android.badge")}</p>
          <h2 id="android-title" className="text-3xl font-bold leading-tight sm:text-4xl">{t("android.title")}</h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-200">{t("android.body")}</p>
          <Button asChild variant="hero" size="xl" className="mt-7 w-full sm:w-auto">
            <a href="/downloads/SmartGuard-v0.5.4-piloto.apk" download="SmartGuard-v0.5.4-piloto.apk" aria-describedby="android-requirements"><Download aria-hidden="true" className="h-5 w-5" />{t("android.download")}</a>
          </Button>
          <p id="android-requirements" className="mt-3 text-sm text-slate-300">{t("android.meta")}</p>
          <p className="mt-5 leading-relaxed text-slate-200">{t("android.permission")}</p>
          <details className="mt-5 border-y border-slate-600 py-4">
            <summary className="cursor-pointer rounded font-semibold text-teal-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{t("android.details")}</summary>
            <ol aria-label={t("android.stepsTitle")} className="mt-4 list-decimal space-y-3 pl-5 leading-relaxed text-slate-200">
              <li>{t("android.step1")}</li><li>{t("android.step2")}</li><li>{t("android.step3")}</li>
            </ol>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">{t("android.note")}</p>
          </details>
          <a href="#analizador" className="mt-5 inline-block text-sm text-teal-200 underline underline-offset-4">{t("android.web")}</a>
        </div>
        <figure className="mx-auto w-full max-w-sm">
          <div className="rounded-[2.5rem] border-[6px] border-slate-600 bg-slate-800 px-5 pb-10 pt-5 shadow-xl sm:px-7">
            <div aria-hidden="true" className="mx-auto mb-10 h-1.5 w-16 rounded-full bg-slate-500" />
            <p className="text-2xl font-bold leading-snug">{t("android.phoneTitle")}</p>
            <p className="mt-3 leading-relaxed text-slate-300">{t("android.phoneBody")}</p>
            <div className="mt-8 rounded-2xl bg-white p-5 text-slate-900">
              <p className="mb-3 flex items-center gap-2 font-semibold text-teal-700"><BellRing aria-hidden="true" className="h-5 w-5 shrink-0" />SmartGuard</p>
              <p className="font-semibold">{t("android.notificationTitle")}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{t("android.notificationBody")}</p>
            </div>
          </div>
          <figcaption className="mt-4 text-center text-sm text-slate-300">{t("android.example")}</figcaption>
        </figure>
      </div>
    </section>
  );
};
