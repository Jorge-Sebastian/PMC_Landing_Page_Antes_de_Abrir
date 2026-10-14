import { describe, expect, it, vi } from "vitest";
import { lookupPopular } from "./popular-domains";

const opts = { baseUrl: "https://example.supabase.co", anonKey: "public-test-key" };

describe("lookupPopular", () => {
  it("consulta el dominio exacto mediante PostgREST", async () => {
    const fetcher = vi.fn(async (_request: RequestInfo | URL) => new Response(JSON.stringify([{ domain: "google.co.uk" }]), { status: 200 }));
    expect(await lookupPopular("GOOGLE.CO.UK", { ...opts, fetcher })).toBe("popular");
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.searchParams.get("domain")).toBe("eq.google.co.uk");
  });

  it("no admite respuestas de subdominios o coincidencias parciales", async () => {
    const fetcher = vi.fn(async (_request: RequestInfo | URL) => new Response(JSON.stringify([{ domain: "x.vercel.app" }]), { status: 200 }));
    expect(await lookupPopular("y.vercel.app", { ...opts, fetcher })).toBe("none");
  });

  it("los errores de red y la falta de datos quedan neutros", async () => {
    expect(await lookupPopular("example.com", { ...opts, fetcher: async () => { throw Error("down"); } })).toBe("none");
    expect(await lookupPopular("example.com")).toBe("none");
  });
});
