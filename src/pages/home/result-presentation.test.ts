import { describe, expect, it } from "vitest";
import { getResultPresentation } from "./result-presentation";
import type { DestinationCheck, Verdict } from "@/lib/link-analysis/types";
const verdict: Verdict = { level: "sin-senales", score: 0, signals: [] };
describe("presentación ante información incompleta", () => {
  it.each<DestinationCheck>([
    { checked: false, reason: "unavailable" },
    { checked: true, reachable: false, status: 404 },
    { checked: true, reachable: false, status: 410 },
    { checked: true, reachable: false, status: 403 },
    { checked: true, reachable: true, status: 200, looksLikeJsShell: true },
  ])("no muestra verde cuando no puede comprobar la página: %j", (destination) => {
    expect(getResultPresentation(verdict, destination)).toMatchObject({ level: "precaucion", uncertain: true });
  });
  it("mantiene rojo aunque el destino no responda", () => {
    expect(getResultPresentation({ ...verdict, level: "riesgo" }, { checked: false }).level).toBe("riesgo");
  });
  it("conserva el nivel cuando la comprobación está completa y no modifica el veredicto", () => {
    expect(getResultPresentation(verdict, { checked: true, reachable: true, status: 200 }).level).toBe("sin-senales");
    expect(verdict.level).toBe("sin-senales");
  });
});
