import { describe, it, expect, beforeEach, afterEach } from "vitest";
// @ts-ignore
import fs from "fs";
// @ts-ignore
import os from "os";
// @ts-ignore
import path from "path";
import { AiConfigLoader } from "../src/config/AiConfigLoader.js";

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "ai-config-loader-"));
const writeFile = (p: string, content: string) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
};

describe("AiConfigLoader", () => {
  let cwdBefore: string;
  let tempDir: string;

  beforeEach(() => {
    cwdBefore = process.cwd();
    tempDir = makeTempDir();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(cwdBefore);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("throws if file does not exist", () => {
    const loader = new AiConfigLoader();
    expect(() => loader.load("config/missing.json")).toThrow(/Config file not found/i);
  });

  it("throws on invalid JSON", () => {
    const loader = new AiConfigLoader();
    writeFile(path.join(tempDir, "config/ai.config.json"), "{ nope }");
    expect(() => loader.load("config/ai.config.json")).toThrow(/Invalid JSON/i);
  });

  it("throws on schema validation error", () => {
    const loader = new AiConfigLoader();
    writeFile(
      path.join(tempDir, "config/ai.config.json"),
      JSON.stringify({ hello: "world" }, null, 2)
    );
    expect(() => loader.load("config/ai.config.json")).toThrow(/Config validation failed/i);
  });

  it("loads valid config", () => {
    const loader = new AiConfigLoader();
    const valid = {
      defaults: { provider: "openai", model: "gpt-4.1-mini", temperature: 0.2 },
      providers: { openai: { apiKeyEnv: "OPENAI_API_KEY", baseUrl: null, timeoutMs: 30000 } },
      domains: {
        devdocs: {
          tasks: { query: { provider: "openai", model: "gpt-4.1", temperature: 0.2 } },
          templates: { "module-readme": { provider: "openai", prompt: "Hello {{name}}" } }
        },
        branding: {
          image: {
            provider: "openai",
            model: "gpt-image-1",
            size: "1024x1024",
            background: "transparent",
            outputFormat: "png"
          }
        }
      }
    };

    writeFile(path.join(tempDir, "config/ai.config.json"), JSON.stringify(valid, null, 2));

    const cfg = loader.load("config/ai.config.json");
    expect(cfg.defaults.provider).toBe("openai");
    expect(cfg.providers.openai.apiKeyEnv).toBe("OPENAI_API_KEY");
    expect(cfg.domains.devdocs.templates?.["module-readme"].prompt).toContain("{{name}}");
    expect(cfg.domains.branding.image?.background).toBe("transparent");
  });

  it("supports absolute paths too", () => {
    const loader = new AiConfigLoader();
    const abs = path.join(tempDir, "config/ai.config.json");

    writeFile(
      abs,
      JSON.stringify(
        {
          defaults: { provider: "openai", model: "gpt-4.1-mini" },
          providers: { openai: { apiKeyEnv: "OPENAI_API_KEY", baseUrl: null } },
          domains: {}
        },
        null,
        2
      )
    );

    const cfg = loader.load(abs);
    expect(cfg.defaults.model).toBe("gpt-4.1-mini");
  });
});
