import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const replaceLinesTool = defineTool({
  declaration: {
    name: "replace_lines",
    description: "Replaces a specific range of lines in a file with new code.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        file_path: { type: Type.STRING },
        start_line: { type: Type.NUMBER, description: "The starting line number (1-indexed)." },
        end_line: { type: Type.NUMBER, description: "The ending line number (inclusive, 1-indexed)." },
        replacementContent: { type: Type.STRING, description: "The new code to insert." }
      },
      required: ["file_path", "start_line", "end_line", "replacementContent"]
    }
  },
  execute: async ({ file_path, start_line, end_line, replacementContent }: { file_path: string; start_line: number; end_line: number; replacementContent: string }, ctx) => {
    const fullPath = join(ctx.repoDir, file_path);
    if (!existsSync(fullPath)) return { status: "error", message: `File ${file_path} not found.` };
    const content = readFileSync(fullPath, "utf8");
    const lines = content.split("\n");
    
    // Safety: Auto-correct swapped line numbers
    let start = start_line;
    let end = end_line;
    if (start > end) {
      console.log(`[SAFETY] Swapping invalid range: ${start}-${end} to ${end}-${start}`);
      [start, end] = [end, start];
    }

    if (start < 1 || end > lines.length || start > end) {
      return { status: "error", message: `Invalid line range: ${start}-${end}. File has ${lines.length} lines.` };
    }

    const before = lines.slice(0, start - 1);
    const after = lines.slice(end);
    const newContent = [...before, replacementContent, ...after].join("\n");
    
    writeFileSync(fullPath, newContent);
    return { status: "success" };
  }
});
