import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock, Mail, ShieldAlert } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Card, CardContent } from "@/components/ui/card";

const CONTACT_EMAIL = "hola@antesdeabrir.app";

const ContactPage = () => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="bg-gradient-hero">
          <div className="section-shell py-12 sm:py-16">
            <h1 className="text-3xl sm:text-4xl">{t("contact.title")}</h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t("contact.lead")}</p>
          </div>
        </div>

        <div className="section-shell pb-16">
          <Card className="border-border/70 shadow-card">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-2">
                <p className="text-[0.95rem] text-muted-foreground">{t("contact.emailLabel")}</p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex items-center gap-3 break-all text-xl font-semibold text-primary underline-offset-4 hover:underline sm:text-2xl"
                >
                  <Mail className="size-6 shrink-0" aria-hidden="true" />
                  {CONTACT_EMAIL}
                </a>
              </div>

              <p className="text-lg">{t("contact.body")}</p>

              <p className="flex items-start gap-2 text-base text-muted-foreground">
                <Clock className="mt-1 size-5 shrink-0" aria-hidden="true" />
                {t("contact.responseNote")}
              </p>

              <p className="flex items-start gap-2 rounded-xl bg-risk-caution-soft px-4 py-3 text-base text-risk-caution-foreground">
                <ShieldAlert className="mt-1 size-5 shrink-0" aria-hidden="true" />
                {t("trust.body2")}
              </p>
            </CardContent>
          </Card>

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

export default ContactPage;
