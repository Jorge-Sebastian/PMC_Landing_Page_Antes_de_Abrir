import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type IconCardProps = {
  icon: LucideIcon;
  title: string;
  body: string;
};

/** Tarjeta sencilla con icono, título corto y una frase. */
export const IconCard = ({ icon: Icon, title, body }: IconCardProps) => (
  <Card className="h-full border-border/70 shadow-soft">
    <CardContent className="space-y-3 p-5 pt-5 sm:p-6 sm:pt-6">
      <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="text-lg">{title}</h3>
      <p className="text-base text-muted-foreground">{body}</p>
    </CardContent>
  </Card>
);
