import { Type } from "@google/genai";
import { defineTool } from "../utils.js";

export const listPullRequestsTool = defineTool({
  declaration: {
    name: "list_pull_requests",
    description: "Lists all open Pull Requests in the repository.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        owner: { type: Type.STRING },
        repo: { type: Type.STRING }
      },
      required: ["owner", "repo"]
    }
  },
  execute: async ({ owner, repo }: { owner: string; repo: string }, ctx) => {
    if (!ctx.octokit) return { status: "skipped", reason: "No GITHUB_TOKEN" };
    const res = await ctx.octokit.rest.pulls.list({ owner, repo, state: "open" });
    const prs: any[] = [];
    for (const p of res.data) {
      let ciStatus = "unknown";
      const failedChecks: string[] = [];
      try {
        const checks = await ctx.octokit.rest.checks.listForRef({
          owner,
          repo,
          ref: p.head.sha
        });
        const status = await ctx.octokit.rest.repos.getCombinedStatusForRef({
          owner,
          repo,
          ref: p.head.sha
        });

        const checkRuns = checks.data.check_runs;
        const statuses = status.data.statuses;

        const hasFailedCheck = checkRuns.some(run => run.conclusion === "failure" || run.conclusion === "action_required");
        const hasFailedStatus = statuses.some(s => s.state === "failure" || s.state === "error");

        const hasPendingCheck = checkRuns.some(run => run.status === "queued" || run.status === "in_progress");
        const hasPendingStatus = status.data.state === "pending";

        if (hasFailedCheck || hasFailedStatus) {
          ciStatus = "failure";
          checkRuns.forEach(run => {
            if (run.conclusion === "failure" || run.conclusion === "action_required") {
              failedChecks.push(`Check Run: ${run.name} - Conclusion: ${run.conclusion}`);
            }
          });
          statuses.forEach(s => {
            if (s.state === "failure" || s.state === "error") {
              failedChecks.push(`Commit Status: ${s.context} - State: ${s.state}`);
            }
          });
        } else if (hasPendingCheck || hasPendingStatus) {
          ciStatus = "pending";
        } else if (checkRuns.length > 0 || statuses.length > 0) {
          ciStatus = "success";
        }
      } catch (e: any) {
        console.error(`Failed to fetch CI status for PR #${p.number}:`, e.message);
      }

      prs.push({
        number: p.number,
        title: p.title,
        head: p.head.ref,
        sha: p.head.sha,
        user: p.user ? { login: p.user.login } : null,
        body: p.body,
        ciStatus,
        failedChecks
      });
    }
    return { status: "success", prs };
  }
});
