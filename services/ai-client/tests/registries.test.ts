import { describe, it, expect } from "vitest";
import { RegistryFactory } from '@app/registry/RegistryFactory';


describe("registries", () => {
  const { domains, commands, providers } = (new RegistryFactory()).create();


  it("DomainRegistry registers and prevents duplicates", () => {
    domains.register({ key: "devdocs", title: "Dev Docs" });
    expect(domains.get("devdocs")?.title).toBe("Dev Docs");
    expect(() => domains.register({ key: "devdocs" })).toThrow();
  });

  it("CommandRegistry registers and prevents duplicates", () => {
    commands.register({ key: "test", capability: "llm", command: "query" });
    expect(commands.get("test.llm.query")?.command).toBe("query");
    expect(() => commands.register({ key: "test", capability: "llm", command: "query" })).toThrow();
  });

  it("ProviderRegistry registers and prevents duplicates", () => {
    providers.register({ key: "openai" });
    expect(providers.get("openai")?.key).toBe("openai");
    expect(() => providers.get("nope")).toThrow();
    expect(() => providers.register({ key: "openai" })).toThrow();
  });
});
