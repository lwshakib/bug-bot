import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ignore from "ignore";

function getFilesRecursively(dir: string, baseDir: string, ig: any): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = relative(baseDir, fullPath);
    if (entry === "node_modules" || entry === ".git" || ig.ignores(relPath)) continue;

    const stats = statSync(fullPath);
    if (stats.isSymbolicLink()) continue;

    if (stats.isDirectory()) {
      files.push(...getFilesRecursively(fullPath, baseDir, ig));
    } else if (/\.(ts|js|tsx|jsx|py|go|java|c|cpp|h|cs|php|rb|rs|json|yaml|yml|toml|lock)$/i.test(entry) || /^(Makefile|Dockerfile)$/i.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

export const listFilesTool = defineTool({
  declaration: {
    name: "list_files",
    description: "Lists all source files in the repository to understand the project structure.",
    parameters: { type: Type.OBJECT, properties: {} }
  },
  execute: async (_, ctx) => {
    const ig = ignore();
    const gitignorePath = join(ctx.repoDir, ".gitignore");
    if (existsSync(gitignorePath)) ig.add(readFileSync(gitignorePath, "utf8"));
    const sourceFiles = getFilesRecursively(ctx.repoDir, ctx.repoDir, ig);
    const fileList = sourceFiles.map(f => relative(ctx.repoDir, f)).join("\n");
    return { status: "success", fileList };
  }
});
