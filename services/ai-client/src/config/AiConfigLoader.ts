import fs from "fs";
import path from "path";
import { AiConfigSchema, type AiConfigParsed } from "./AiConfigSchema.js";

export class AiConfigLoader {
  public load(configPath: string): AiConfigParsed {
    const abs = path.isAbsolute(configPath) ? configPath : path.join(process.cwd(), configPath);
    if (!fs.existsSync(abs)) {
      throw new Error(`Config file not found: ${abs}`);
    }

    const raw = fs.readFileSync(abs, "utf8");
    let json: unknown;

    try {
      json = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Invalid JSON in config: ${abs}`);
    }

    const parsed = AiConfigSchema.safeParse(json);
    if (!parsed.success) {
      const msg = parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n");
      throw new Error(`Config validation failed:\n${msg}`);
    }

    return parsed.data;
  }
}
