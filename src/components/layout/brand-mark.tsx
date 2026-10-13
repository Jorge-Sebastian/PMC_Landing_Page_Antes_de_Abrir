import { cn } from "@/lib/utils";

/** Isotipo mostrado a partir del logo original del equipo. */
export const BrandMark = ({ className }: { className?: string }) => (
  <span aria-hidden="true" className={cn("relative block size-11 shrink-0 overflow-hidden rounded-xl bg-white", className)}>
    <img src="/branding/smartguard-logo.jpeg" alt="" className="absolute left-1/2 top-[-11px] w-[76px] max-w-none [clip-path:inset(0_0_33%_0)] -translate-x-1/2" />
  </span>
);
