import { cn } from "@/lib/utils";

/** Isotipo mostrado a partir del logo original del equipo. */
export const BrandMark = ({ className, priority = false }: { className?: string; priority?: boolean }) => (
  <span aria-hidden="true" className={cn("relative block size-11 shrink-0 overflow-hidden rounded-xl bg-white", className)}>
    <img src="/branding/smartguard-logo.jpeg" alt="" width={76} height={76} decoding="async" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} className="absolute left-1/2 top-[-11px] w-[76px] max-w-none [clip-path:inset(0_0_33%_0)] -translate-x-1/2" />
  </span>
);
