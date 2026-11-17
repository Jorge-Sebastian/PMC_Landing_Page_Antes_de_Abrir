import { describe, expect, it } from "vitest";
import {
  ALL_TABS, BASIC_TABS, PREVIEW_SCENARIOS, canOpenTab, scenarioTitle, visibleTabs,
} from "./access-navigation";

describe("SmartGuard Android navigation scenarios", () => {
  it("keeps five navigation views in the current real pilot", () => {
    expect(visibleTabs("real")).toEqual(ALL_TABS);
  });
  it("shows five views for trial and premium visual previews", () => {
    for (const state of ["trial", "premium"] as const) {
      expect(visibleTabs(state)).toEqual(ALL_TABS);
      expect(canOpenTab(state, "family")).toBe(true);
    }
  });
  it("shows ONLY Home and Analyze for Free, Expired and Invited", () => {
    for (const state of ["free", "expired", "invited"] as const) {
      expect(visibleTabs(state)).toEqual(BASIC_TABS);
      expect(canOpenTab(state, "activity")).toBe(false);
      expect(canOpenTab(state, "protection")).toBe(false);
      expect(canOpenTab(state, "family")).toBe(false);
      expect(canOpenTab(state, "analyze")).toBe(true);
    }
  });
  it("provides exactly five test scenarios and a separate real state", () => {
    expect(PREVIEW_SCENARIOS.map((s) => s.id)).toEqual([
      "trial", "premium", "free", "expired", "invited",
    ]);
    expect(scenarioTitle("real")).toBe("Aplicacion real");
  });
});
