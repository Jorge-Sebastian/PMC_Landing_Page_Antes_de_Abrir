import { Show, SignInButton, UserButton } from "@clerk/react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export const AuthControls = () => {
  const { t } = useTranslation();
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) return null;
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button variant="outline" className="h-10 text-base">{t("auth.signIn")}</Button>
        </SignInButton>
      </Show>
      <Show when="signed-in"><UserButton /></Show>
    </>
  );
};
