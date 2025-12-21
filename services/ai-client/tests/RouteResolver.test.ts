import { describe, it, expect } from "vitest";
import { RouteResolver } from "../src/config/RouteResolver.js";
import type { AiConfigParsed } from "../src/config/AiConfigSchema.js";

const cfg: AiConfigParsed = {
  defaults: { provider: "openai", model: "gpt-4.1-mini", temperature: 0.2 },
  providers: { openai: { apiKeyEnv: "OPENAI_API_KEY", baseUrl: null } },
  routes: {
    "devdocs.llm.query": { model: "gpt-4.1", instructions: "Be concise", temperature: 0.1 },
    "branding.image.default": { model: "gpt-image-1", background: "transparent", outputFormat: "png" }
  }
};

describe("RouteResolver", () => {
  const resolver = new RouteResolver(cfg);

  it("resolves existing route and applies defaults", () => {
    const r = resolver.resolve("devdocs.llm.query");
    expect(r.provider).toBe("openai");
    expect(r.model).toBe("gpt-4.1");
    expect(r.temperature).toBe(0.1);
    expect(r.instructions).toBe("Be concise");
  });

  it("resolves by parts", () => {
    const r = resolver.resolveParts("branding", "image", "default");
    expect(r.model).toBe("gpt-image-1");
    expect(r.background).toBe("transparent");
  });

  it("throws on missing route", () => {
    expect(() => resolver.resolve("missing.llm.query")).toThrow(/Route not found/i);
  });

  it("has() works", () => {
    expect(resolver.has("devdocs.llm.query")).toBe(true);
    expect(resolver.has("nope")).toBe(false);
  });
});
