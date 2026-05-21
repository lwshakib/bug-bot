import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const readFileTool = defineTool({
  declaration: {
    name: "read_file",
    description: "Reads the content of a specific file with line numbers.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        file_path: { type: Type.STRING }
      },
      required: ["file_path"]
    }
  },
  execute: async ({ file_path }: { file_path: string }, ctx) => {
    const resolvedRepo = resolve(ctx.repoDir);
    const fullPath = resolve(join(resolvedRepo, file_path));
    if (!fullPath.startsWith(resolvedRepo)) {
      return { status: "error", message: "Path traversal detected: Access outside repository root is forbidden." };
    }
    if (!existsSync(fullPath)) return { status: "error", message: `File ${file_path} not found.` };
    const content = readFileSync(fullPath, "utf8");
    const lines = content.split("\n");
    const numberedContent = lines.map((line, idx) => `${idx + 1}: ${line}`).join("\n");
    return { status: "success", content: numberedContent };
  }
});
