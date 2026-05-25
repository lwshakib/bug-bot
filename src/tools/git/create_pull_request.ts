import { Type } from "@google/genai";
import { defineTool, run } from "../utils.js";
import { execSync } from "node:child_process";

export const createPullRequestTool = defineTool({
  declaration: {
    name: "create_pull_request",
    description: "Commits changes and creates a Pull Request.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        owner: { type: Type.STRING },
        repo: { type: Type.STRING },
        branch_name: { type: Type.STRING },
        title: { type: Type.STRING },
        body: { type: Type.STRING },
        issue_number: { type: Type.NUMBER, description: "Optional issue number to link and close (e.g. 123)." },
        issue_url: { type: Type.STRING, description: "Optional URL of the issue being resolved." }
      },
      required: ["owner", "repo", "branch_name", "title", "body"]
    }
  },
  execute: async ({ owner, repo, branch_name, title, body, issue_number }: { owner: string; repo: string; branch_name: string; title: string; body: string; issue_number?: number; issue_url?: string }, ctx) => {
    if (!ctx.octokit) return { status: "skipped", reason: "No GITHUB_TOKEN" };

    // --- Validation gate: At least one validation must pass, none can be failing ---
    if (ctx.hasUnvalidatedChanges || ctx.validationPasses.length === 0 || ctx.validationFailures.length > 0) {
      return {
        status: "error",
        message: [
          "Validation gate blocked pull request creation.",
          "You MUST run ALL validation commands found in the repository's CI workflows and package.json scripts (build, lint, format, typecheck, test, etc.) with is_validation: true.",
          "If validation fails, you MUST fix the errors and re-run ALL failed checks until they pass. Do NOT skip failing checks or attempt to create a PR with known failures.",
          ctx.validationPasses.length > 0 ? `Passing validation observed: ${ctx.validationPasses.join("; ")}` : "No passing validation command has been observed after the latest code change.",
          ctx.validationFailures.length > 0 ? `Failing validation observed: ${ctx.validationFailures.join("; ")}` : ""
        ].filter(Boolean).join(" ")
      };
    }
    
    // Validate branch_name to prevent command injection
    if (!/^[a-zA-Z0-9_./-]+$/.test(branch_name)) {
      return { status: "error", message: "Invalid branch name format. Only alphanumeric characters, dashes, underscores, dots, and slashes are allowed." };
    }

    // Setup Identity for commits
    const env = { ...process.env, GIT_AUTHOR_NAME: "Shakib Khan", GIT_AUTHOR_EMAIL: "leadwithshakib@gmail.com", GIT_COMMITTER_NAME: "Shakib Khan", GIT_COMMITTER_EMAIL: "leadwithshakib@gmail.com" };

    // Use -B to create or reset the branch if it already exists locally
    run(`git checkout -B ${branch_name}`, ctx.repoDir);
    run(`git add .`, ctx.repoDir);
    
    try {
      const escapedTitle = title.replace(/[\\"]/g, '\\$&');
      execSync(`git commit -m "${escapedTitle}"`, { cwd: ctx.repoDir, env });
    } catch (e) {
      console.log("Nothing to commit, continuing...");
    }

    // Use --force to ensure the push succeeds even if the remote branch exists
    execSync(`git push origin ${branch_name} --force`, { cwd: ctx.repoDir, env });
    
    let finalBody = body;
    if (issue_number) {
      const closingPhrase = `Closes #${issue_number}`;
      if (!finalBody.includes(closingPhrase)) {
        finalBody += `\n\n${closingPhrase}`;
      }
    }

    let baseBranch = "main";
    try {
      // Check if master exists and main does not
      execSync(`git show-ref --verify --quiet refs/remotes/origin/master`, { cwd: ctx.repoDir });
      try {
        execSync(`git show-ref --verify --quiet refs/remotes/origin/main`, { cwd: ctx.repoDir });
      } catch {
        baseBranch = "master";
      }
    } catch {}
    
    try {
      const res = await ctx.octokit.rest.pulls.create({ owner, repo, title, head: branch_name, base: baseBranch, body: finalBody });
      
      // Cleanup: Return to base branch
      try {
        run(`git checkout ${baseBranch}`, ctx.repoDir);
        run(`git reset --hard origin/${baseBranch}`, ctx.repoDir);
      } catch (e) {
        console.log("Cleanup failed, but PR was created.");
      }

      return { status: "success", url: res.data.html_url };
    } catch (e: any) {
      if (e.message.includes("A pull request already exists")) {
        const pulls = await ctx.octokit.rest.pulls.list({ owner, repo, head: `${owner}:${branch_name}`, state: "open" });
        if (pulls.data.length > 0) {
          const pr = pulls.data[0]!;
          return { status: "success", url: pr.html_url, message: "Pull request already exists." };
        }
      }
      throw e;
    }
  }
});
