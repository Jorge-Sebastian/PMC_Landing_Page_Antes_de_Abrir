import { supabase } from "@/integrations/supabase/client";
import type { DestinationCheck, DestinationReason } from "./types";

const TIMEOUT_MS = 9000;

/**
 * Pide a la función de backend que compruebe a dónde lleva el enlace. Si algo
 * falla (red, bloqueo o demora), devuelve `checked: false` en lugar de un
 * resultado inventado: la interfaz muestra entonces que no se pudo comprobar.
 */
export const checkDestination = async (url: string): Promise<DestinationCheck> => {
  try {
    const request = supabase.functions.invoke("check-link", {
      body: { url },
      headers: { "Content-Type": "application/json" },
    });
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS);
    });

    const { data, error } = await Promise.race([request, timeout]);
    if (error || !data || typeof data !== "object") {
      return { checked: false, reason: "unavailable" };
    }

    const payload = data as Record<string, unknown>;
    if (payload.ok !== true) {
      const reason = typeof payload.reason === "string" ? payload.reason : "unavailable";
      return { checked: false, reason: reason as DestinationReason };
    }

    return {
      checked: true,
      reachable: payload.reachable === true,
      status: Number(payload.status) || 0,
      finalUrl: typeof payload.finalUrl === "string" ? payload.finalUrl : url,
      finalHost: typeof payload.finalHost === "string" ? payload.finalHost : "",
      redirects: Array.isArray(payload.redirects) ? payload.redirects.map(String) : [],
      differentHost: payload.differentHost === true,
      title: typeof payload.title === "string" ? payload.title : "",
      hasPasswordField: payload.hasPasswordField === true,
    };
  } catch {
    return { checked: false, reason: "unavailable" };
  }
};
