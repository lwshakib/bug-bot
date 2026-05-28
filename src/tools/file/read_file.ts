import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const readFileTool = defineTool({
  declaration: {
    name: "read_file",
    description: "Reads the content of one or more files with line numbers. You can provide either 'file_path' for a single file or 'file_paths' to read up to 5 files at once. To save tokens and stay within context limits, use 'start_line' and 'end_line' to read specific slices.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        file_path: { type: Type.STRING, description: "The path of a single file to read." },
        file_paths: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Optional array of up to 5 file paths to read in batch."
        },
        start_line: { type: Type.INTEGER, description: "Optional start line number (1-indexed, inclusive) to read a specific slice." },
        end_line: { type: Type.INTEGER, description: "Optional end line number (1-indexed, inclusive) to read a specific slice." }
      }
    }
  },
  execute: async ({ file_path, file_paths, start_line, end_line }: { file_path?: string; file_paths?: string[]; start_line?: number; end_line?: number }, ctx) => {
    const resolvedRepo = resolve(ctx.repoDir);

    const readFileSafely = (pathStr: string, start?: number, end?: number) => {
      const fullPath = resolve(join(resolvedRepo, pathStr));
      if (!fullPath.startsWith(resolvedRepo)) {
        return { status: "error", message: `Path traversal detected: Access outside repository root is forbidden for path ${pathStr}.` };
      }
      if (!existsSync(fullPath)) {
        return { status: "error", message: `File ${pathStr} not found.` };
      }
      const content = readFileSync(fullPath, "utf8");
      const lines = content.split(/\r?\n/);
      
      const startIdx = start && start > 0 ? start - 1 : 0;
      const endIdx = end && end >= startIdx + 1 ? Math.min(end, lines.length) : lines.length;
      
      const slicedLines = lines.slice(startIdx, endIdx);
      const numberedContent = slicedLines.map((line, idx) => `${startIdx + idx + 1}: ${line}`).join("\n");
      return { 
        status: "success", 
        content: numberedContent,
        total_lines: lines.length,
        range_read: `${startIdx + 1}-${endIdx}`
      };
    };

    if (file_paths && file_paths.length > 0) {
      const targets = file_paths.slice(0, 5);
      const results: Record<string, any> = {};
      for (const target of targets) {
        results[target] = readFileSafely(target, start_line, end_line);
      }
      return { status: "success", files: results };
    } else if (file_path) {
      return readFileSafely(file_path, start_line, end_line);
    } else {
      return { status: "error", message: "You must provide either 'file_path' or 'file_paths'." };
    }
  }
});
