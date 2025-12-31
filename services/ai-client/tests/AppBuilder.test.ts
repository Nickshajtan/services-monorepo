import { describe, it, expect } from "vitest";
import { AppBuilder } from '@app/AppBuilder';
import { AiModule, ModuleTogglePolicy } from '@app/modularity/contracts';

type ModuleContext = { config: any; bus: any };
class TestAppBuilder extends AppBuilder {
  public ensureDeps() {
    return this.resolveModules({ config: {}, bus: {} } as ModuleContext);
  }

  public sort(mods: AiModule[]) {
    return this.topoSortWithPriority(mods);
  }
}

const mod = (name: string, opts?: { dependsOn?: string[]; priority?: number }): AiModule => ({
  name,
  dependsOn: opts?.dependsOn,
  priority: opts?.priority,
});
const indexMap = (mods: AiModule[]) =>
  new Map(mods.map((m, i) => [m.name, i] as const));

describe("AppBuilder - dependency validation", () => {
  it("throws if a dependency is missing in active modules", () => {
    const builder = new TestAppBuilder();
    builder.withModules([mod("A", { dependsOn: ["B"] })]);

    expect(() => builder.ensureDeps()).toThrow(
      /requires "B".*but it is not registered/i
    );
  });

  it("does not throw when all dependencies are present", () => {
    const builder = new TestAppBuilder();
    builder.withModules([mod("B"), mod("A", { dependsOn: ["B"] })]);

    expect(() => builder.ensureDeps()).not.toThrow();
  });
});

describe("AppBuilder - topoSortWithPriority", () => {
  const builder = new TestAppBuilder();

  it("orders dependencies before dependents", () => {
    const mods = [
      mod("A", { dependsOn: ["B", "C"] }),
      mod("B", { dependsOn: ["D"] }),
      mod("C"),
      mod("D"),
    ];

    const sorted = builder.sort(mods);
    const idx = indexMap(sorted);

    expect(idx.get("D")!).toBeLessThan(idx.get("B")!);
    expect(idx.get("B")!).toBeLessThan(idx.get("A")!);
    expect(idx.get("C")!).toBeLessThan(idx.get("A")!);
  });

  it("respects priority among independent modules (higher first)", () => {
    const mods = [
      mod("low", { priority: 0 }),
      mod("high", { priority: 10 }),
      mod("mid", { priority: 5 }),
    ];

    const sorted = builder.sort(mods);
    expect(sorted.map((m) => m.name)).toEqual(["high", "mid", "low"]);
  });

  it("priority cannot violate dependencies", () => {
    const mods = [
      mod("A", { dependsOn: ["B"], priority: 100 }),
      mod("B", { priority: 0 }),
    ];

    const sorted = builder.sort(mods);
    expect(sorted.map((m) => m.name)).toEqual(["B", "A"]);
  });

  it("throws on cycle", () => {
    const mods = [
      mod("A", { dependsOn: ["B"] }),
      mod("B", { dependsOn: ["A"] }),
    ];

    expect(() => builder.sort(mods)).toThrow(/cycle detected/i);
  });

  it("throws on unknown dependency", () => {
    const mods = [mod("A", { dependsOn: ["NOPE"] })];
    expect(() => builder.sort(mods)).toThrow(/Internal error: "NOPE" not in enabled module graph/i);
  });
});

describe("AppBuilder - policy + sort + deps", () => {
  it("filters modules via toggle policy, then sorts and validates deps", () => {
    const builder = new TestAppBuilder();
    builder.withModules([
      mod("A", { dependsOn: ["B"] }),
      mod("B"),
      mod("C"),
    ]);
    builder.withTogglePolicy({
      isEnabled: (m) => m.name !== "C",
    } as ModuleTogglePolicy);

    expect(builder.ensureDeps().map((m) => m.name)).toEqual(["B", "A"]);
  });

  it("fails if policy disables a required dependency", () => {
    const builder = new TestAppBuilder();
    builder.withModules([
      mod("A", { dependsOn: ["B"] }),
      mod("B"),
    ]);
    builder.withTogglePolicy({
      isEnabled: (m) => m.name !== "B"
    } as ModuleTogglePolicy);

    expect(() => builder.ensureDeps()).toThrow(
      /requires "B".* but it's disabled/i
    );
  });
});
