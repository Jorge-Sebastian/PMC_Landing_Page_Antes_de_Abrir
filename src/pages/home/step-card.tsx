import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StepCardProps = {
  step: number;
  icon: LucideIcon;
  title: string;
  body: string;
  label: string;
};

/** Tarjeta numerada de la sección «¿Cómo funciona?». */
export const StepCard = ({ step, icon: Icon, title, body, label }: StepCardProps) => (
  <Card className="h-full border-border/70 shadow-soft">
    <CardContent className="space-y-4 p-6 pt-6 sm:p-7 sm:pt-7">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <span className="rounded-full bg-secondary px-3 py-1 text-[0.9rem] font-semibold text-secondary-foreground">
          {label}
        </span>
      </div>
      <h3 className="text-xl">{title}</h3>
      <p className="text-base text-muted-foreground">{body}</p>
    </CardContent>
  </Card>
);
