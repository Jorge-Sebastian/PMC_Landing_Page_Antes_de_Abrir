import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/** Logotipo de «Antes de Abrir»: escudo discreto dentro de una pastilla suave. */
export const BrandMark = ({ className }: { className?: string }) => (
  <span
    aria-hidden="true"
    className={cn(
      "flex size-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow",
      className,
    )}
  >
    <ShieldCheck className="size-6" />
  </span>
);
