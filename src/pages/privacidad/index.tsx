import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft, Link2, ShieldCheck, SquareArrowOutUpRight } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Card, CardContent } from "@/components/ui/card";

const PrivacyPage = () => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="bg-gradient-hero">
          <div className="section-shell py-12 sm:py-16">
            <h1 className="text-3xl sm:text-4xl">{t("privacy.title")}</h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t("privacy.lead")}</p>
          </div>
        </div>

        <div className="section-shell pb-16">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-border/70 shadow-soft">
              <CardContent className="space-y-3 p-6 pt-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="size-6" aria-hidden="true" />
                </span>
                <h2 className="text-xl">{t("privacy.item1.title")}</h2>
                <p className="text-base text-muted-foreground">{t("privacy.item1.body")}</p>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-soft">
              <CardContent className="space-y-3 p-6 pt-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Link2 className="size-6" aria-hidden="true" />
                </span>
                <h2 className="text-xl">{t("privacy.item2.title")}</h2>
                <p className="text-base text-muted-foreground">{t("privacy.item2.body")}</p>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-soft">
              <CardContent className="space-y-3 p-6 pt-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <SquareArrowOutUpRight className="size-6" aria-hidden="true" />
                </span>
                <h2 className="text-xl">{t("privacy.item3.title")}</h2>
                <p className="text-base text-muted-foreground">{t("privacy.item3.body")}</p>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-soft">
              <CardContent className="space-y-3 p-6 pt-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <ShieldCheck className="size-6" aria-hidden="true" />
                </span>
                <h2 className="text-xl">{t("privacy.item4.title")}</h2>
                <p className="text-base text-muted-foreground">{t("privacy.item4.body")}</p>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-soft sm:col-span-2">
              <CardContent className="space-y-3 p-6 pt-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <ShieldCheck className="size-6" aria-hidden="true" />
                </span>
                <h2 className="text-xl">{t("privacy.item5.title")}</h2>
                <p className="text-base text-muted-foreground">{t("privacy.item5.body")}</p>
              </CardContent>
            </Card>
          </div>

          <Link
            to="/"
            className="mt-10 inline-flex items-center gap-2 text-base font-medium text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            {t("common.backHome")}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default PrivacyPage;
