import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Gift, Package, Landmark, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";

const examples = [
  { id: "delivery", icon: Package, label: "examples.delivery", message: "examples.delivery.message" },
  { id: "account", icon: Landmark, label: "examples.account", message: "examples.account.message" },
  { id: "prize", icon: Gift, label: "examples.prize", message: "examples.prize.message" },
] as const;

export const MessageExamples = ({ onSelect, disabled }: { onSelect: (message: string) => void; disabled: boolean }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<(typeof examples)[number]>(examples[0]);
  return (
    <section aria-labelledby="ejemplos-mensajes" className="mt-8 border-t border-primary/20 pt-6">
      <div className="mb-4 flex items-start gap-3">
        <MessageSquareText className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" />
        <div><h2 id="ejemplos-mensajes" className="text-xl">{t("examples.title")}</h2><p className="mt-1 text-base text-muted-foreground">{t("examples.subtitle")}</p></div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("examples.choose")}>
        {examples.map((example) => <Button key={example.id} type="button" variant={selected.id === example.id ? "default" : "outline"} aria-pressed={selected.id === example.id} onClick={() => setSelected(example)}><example.icon className="size-4" aria-hidden="true" />{t(example.label)}</Button>)}
      </div>
      <div className="mt-4 rounded-2xl rounded-tl-sm border border-primary/15 bg-card p-5 shadow-sm">
        <p className="text-sm font-medium text-primary">{t("examples.fictional")}</p>
        <p className="mt-2 break-words text-lg leading-relaxed" aria-live="polite">{t(selected.message)}</p>
        <Button type="button" variant="soft" className="mt-4" disabled={disabled} onClick={() => onSelect(t(selected.message))}>{t("examples.use")}</Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{t("examples.note")}</p>
    </section>
  );
};
