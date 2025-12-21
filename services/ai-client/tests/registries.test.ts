import { describe, it, expect } from "vitest";
import { DomainRegistry } from "@app/registry/DomainRegistry";
import { CommandRegistry } from "@app/registry/CommandRegistry";
import { ProviderRegistry } from "@app/registry/ProviderRegistry";

describe("registries", () => {
  it("DomainRegistry registers and prevents duplicates", () => {
    const r = new DomainRegistry();
    r.register({ key: "devdocs", title: "Dev Docs" });
    expect(r.get("devdocs")?.title).toBe("Dev Docs");
    expect(() => r.register({ key: "devdocs" })).toThrow();
  });

  it("CommandRegistry registers and prevents duplicates", () => {
    const r = new CommandRegistry();
    r.register({ capability: "llm", command: "query" });
    expect(r.get("llm", "query")?.command).toBe("query");
    expect(() => r.register({ capability: "llm", command: "query" })).toThrow();
  });

  it("ProviderRegistry registers and resolves", () => {
    const r = new ProviderRegistry();
    r.register({ name: "openai" });
    expect(r.get("openai").name).toBe("openai");
    expect(() => r.get("nope")).toThrow();
  });
});
