import { describe, it, expect } from "vitest";
import { RouteResolver } from "@app/routes/RouteResolver";
import type { AiConfigParsed } from "@config/AiConfigSchema";

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
    expect(() => resolver.resolve("missing.llm.query"))
      .toThrow(/Route not found:\s*missing\.llm\.query/i);
  });

  it("matches() works", () => {
    expect(resolver.matches("devdocs.llm.query")).toBe(true);
    expect(resolver.matches("nope")).toBe(false);
  });
});

describe("RouteResolver wildcards", () => {
  const resolver = new RouteResolver({
    ...cfg,
    routes: {
      "*.*.*": { temperature: 0.3 },
      "devdocs.llm.*": { instructions: "Be concise" },
      ...cfg.routes
    }
  });

  it("merges global + wildcard + exact (exact wins)", () => {
    const r = resolver.resolve("devdocs.llm.query");
    expect(r.temperature).toBe(0.1); // exact overrides
    expect(r.instructions).toBe("Be concise"); // from devdocs.llm.*
    expect(r.model).toBe("gpt-4.1");
    expect(r.matchedKeys).toEqual(["*.*.*", "devdocs.llm.*", "devdocs.llm.query"]);
  });

  it("uses wildcard when exact missing", () => {
    const r = resolver.resolve("devdocs.llm.doc");
    expect(r.instructions).toBe("Be concise");
    expect(r.temperature).toBe(0.3); // from global
    expect(r.model).toBe("gpt-4.1-mini"); // defaults
    expect(r.matchedKeys).toEqual(["*.*.*", "devdocs.llm.*"]);
  });
});
