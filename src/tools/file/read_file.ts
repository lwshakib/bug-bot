import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const readFileTool = defineTool({
  declaration: {
    name: "read_file",
    description: "Reads the content of one or more files with line numbers. You can provide either 'file_path' for a single file or 'file_paths' to read up to 5 files at once.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        file_path: { type: Type.STRING, description: "The path of a single file to read." },
        file_paths: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Optional array of up to 5 file paths to read in batch."
        }
      }
    }
  },
  execute: async ({ file_path, file_paths }: { file_path?: string; file_paths?: string[] }, ctx) => {
    const resolvedRepo = resolve(ctx.repoDir);

    const readFileSafely = (pathStr: string) => {
      const fullPath = resolve(join(resolvedRepo, pathStr));
      if (!fullPath.startsWith(resolvedRepo)) {
        return { status: "error", message: `Path traversal detected: Access outside repository root is forbidden for path ${pathStr}.` };
      }
      if (!existsSync(fullPath)) {
        return { status: "error", message: `File ${pathStr} not found.` };
      }
      const content = readFileSync(fullPath, "utf8");
      const lines = content.split("\n");
      const numberedContent = lines.map((line, idx) => `${idx + 1}: ${line}`).join("\n");
      return { status: "success", content: numberedContent };
    };

    if (file_paths && file_paths.length > 0) {
      const targets = file_paths.slice(0, 5);
      const results: Record<string, any> = {};
      for (const target of targets) {
        results[target] = readFileSafely(target);
      }
      return { status: "success", files: results };
    } else if (file_path) {
      return readFileSafely(file_path);
    } else {
      return { status: "error", message: "You must provide either 'file_path' or 'file_paths'." };
    }
  }
});
