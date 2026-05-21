import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
    const fullPath = join(ctx.repoDir, file_path);
    if (!existsSync(fullPath)) return { status: "error", message: `File ${file_path} not found.` };
    const content = readFileSync(fullPath, "utf8");
    const lines = content.split("\n");
    const numberedContent = lines.map((line, idx) => `${idx + 1}: ${line}`).join("\n");
    return { status: "success", content: numberedContent };
  }
});
