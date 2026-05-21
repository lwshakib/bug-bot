import { Type } from "@google/genai";
import { defineTool, run } from "../utils.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isProduction } from "../../env.js";

export const cloneRepositoryTool = defineTool({
  declaration: {
    name: "clone_repository",
    description: "Clones a GitHub repository into a temporary directory.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        repo_name: { type: Type.STRING, description: "The owner/repo name or full URL." }
      },
      required: ["repo_name"]
    }
  },
  execute: async ({ repo_name }: { repo_name: string }, ctx) => {
    const workRoot = mkdtempSync(join(tmpdir(), "repo-agent-"));
    const repoDir = join(workRoot, "repo");
    ctx.setWorkRoot(workRoot);
    ctx.setRepoDir(repoDir);

    let url = repo_name.includes("://") ? repo_name : `https://github.com/${repo_name}.git`;
    if (isProduction && ctx.githubToken && url.startsWith("https://github.com/")) {
      url = url.replace("https://github.com/", `https://x-access-token:${ctx.githubToken}@github.com/`);
    }
    run(`git clone --depth 1 "${url}" "${repoDir}"`, process.cwd());
    return { status: "success", repoDir };
  }
});
