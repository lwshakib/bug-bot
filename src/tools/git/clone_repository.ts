import { Type } from "@google/genai";
import { defineTool, run } from "../utils.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isProduction } from "../../env.js";
import { inspectCIConfiguration } from "../ci_discovery.js";

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
    // Validate repo_name format to prevent command injection
    const isValidFormat = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo_name) ||
      /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\.git)?$/.test(repo_name);
    if (!isValidFormat) {
      return { status: "error", message: "Invalid repository format. Must be 'owner/repo' or a valid GitHub HTTPS URL." };
    }

    const workRoot = mkdtempSync(join(tmpdir(), "repo-agent-"));
    const repoDir = join(workRoot, "repo");
    ctx.setWorkRoot(workRoot);
    ctx.setRepoDir(repoDir);

    let url = repo_name.includes("://") ? repo_name : `https://github.com/${repo_name}.git`;
    if (isProduction && ctx.githubToken && url.startsWith("https://github.com/")) {
      url = url.replace("https://github.com/", `https://x-access-token:${ctx.githubToken}@github.com/`);
    }
    run(`git clone --depth 1 "${url}" "${repoDir}"`, process.cwd());

    // Inspect CI configuration and pass raw content to the AI for decision-making
    const ciInfo = inspectCIConfiguration(repoDir);

    return { 
      status: "success", 
      repoDir,
      packageManager: ciInfo.packageManager,
      ciConfiguration: ciInfo.summary,
      instruction: "IMPORTANT: Review the CI configuration above carefully. You MUST identify ALL validation/check/build/lint/format/typecheck commands from the workflows and package.json scripts, then run EVERY SINGLE ONE as validation (with is_validation: true) before creating a PR. If ANY validation fails, fix the errors and re-run until all pass."
    };
  }
});
