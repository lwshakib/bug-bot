import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";

/**
 * Validates the structural syntax of the edited file.
 * Returns an error string if invalid, or null if syntax is clean.
 */
function validateSyntax(filePath: string, content: string): string | null {
  const ext = filePath.split(".").pop()?.toLowerCase();
  
  if (ext === "json") {
    try {
      JSON.parse(content);
    } catch (e: any) {
      return `JSON parsing failed: ${e.message}`;
    }
    return null;
  }

  if (["ts", "js", "tsx", "jsx"].includes(ext || "")) {
    try {
      let scriptKind = ts.ScriptKind.Unknown;
      if (ext === "js") scriptKind = ts.ScriptKind.JS;
      else if (ext === "jsx") scriptKind = ts.ScriptKind.JSX;
      else if (ext === "ts") scriptKind = ts.ScriptKind.TS;
      else if (ext === "tsx") scriptKind = ts.ScriptKind.TSX;

      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
      );
      const diagnostics = (sourceFile as any).parseDiagnostics || [];
      if (diagnostics.length > 0) {
        const errors = diagnostics.map((d: any) => {
          const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, d.start || 0);
          const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n");
          return `Line ${line + 1}, Char ${character + 1}: ${msg}`;
        });
        return `TypeScript/JavaScript syntax errors: ${errors.join("; ")}`;
      }
    } catch (e: any) {
      // Gracefully fall back if compiler fails to run
      console.error(`[SYNTAX GATE] AST parser failed for ${filePath}: ${e.message}`);
    }
  }

  return null;
}

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
    const resolvedRepo = resolve(ctx.repoDir);
    const fullPath = resolve(join(resolvedRepo, file_path));
    if (!fullPath.startsWith(resolvedRepo)) {
      return { status: "error", message: "Path traversal detected: Access outside repository root is forbidden." };
    }
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

    // Sanitize: The Gemini model sometimes double-escapes quotes, newlines, tabs, and other
    // characters in function call args. Since the SDK already handles JSON deserialization,
    // any remaining double-escaped sequences in the content are model artifacts.
    let sanitized = replacementContent;
    if (sanitized.includes('\\"') || sanitized.includes('\\n') || sanitized.includes('\\t') || sanitized.includes('\\\\')) {
      console.log(`[SANITIZE] Sanitizing double-escaped artifacts in replacement content for ${file_path}`);
      sanitized = sanitized
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
    }

    const newContent = [...before, sanitized, ...after].join("\n");
    
    // --- AST/Syntax Validation Gate ---
    const syntaxError = validateSyntax(file_path, newContent);
    if (syntaxError) {
      console.log(`[SYNTAX GATE] Blocked write to ${file_path}: ${syntaxError}`);
      return {
        status: "error",
        message: `Your code modification was rejected because it introduces a structural syntax error: ${syntaxError}. Please fix the syntax error in your replacementContent and try again.`
      };
    }

    writeFileSync(fullPath, newContent);
    ctx.markFilesChanged();
    return { status: "success" };
  }
});
