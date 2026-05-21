import { Type } from "@google/genai";
import { defineTool } from "../utils.js";

export const listIssuesTool = defineTool({
  declaration: {
    name: "list_issues",
    description: "Lists all open issues in the repository.",
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
    
    // Fetch issues
    const res = await ctx.octokit.rest.issues.listForRepo({ owner, repo, state: "open" });
    const issues = res.data
      .filter(i => !i.pull_request)
      .map(i => ({ number: i.number, title: i.title, body: i.body, url: i.html_url }));

    // Fetch open PRs to find links to issues
    let botLogin = "";
    try {
      const userRes = await ctx.octokit.rest.users.getAuthenticated();
      botLogin = userRes.data.login;
    } catch (e) {
      console.warn("Failed to get authenticated user login:", e);
    }

    const prsRes = await ctx.octokit.rest.pulls.list({ owner, repo, state: "open" });
    const activePrIssueNumbers = new Set<number>();
    const botActivePrIssueNumbers = new Set<number>();

    for (const pr of prsRes.data) {
      const textToSearch = `${pr.title} ${pr.body || ""} ${pr.head.ref}`;
      const matches = textToSearch.match(/#(\d+)\b|\bissue-(\d+)\b|\bissues\/(\d+)\b/gi);
      if (matches) {
        for (const match of matches) {
          const numStr = match.replace(/\D/g, "");
          if (numStr) {
            const issueNum = parseInt(numStr, 10);
            activePrIssueNumbers.add(issueNum);
            if (pr.user?.login === botLogin) {
              botActivePrIssueNumbers.add(issueNum);
            }
          }
        }
      }
    }

    const filteredIssues = [];
    for (const issue of issues) {
      if (botActivePrIssueNumbers.has(issue.number)) {
        console.log(`[PR FILTER] Issue #${issue.number} has active PR by this bot (${botLogin}). MUST avoid.`);
        continue;
      }
      if (activePrIssueNumbers.has(issue.number)) {
        console.log(`[PR FILTER] Issue #${issue.number} has active PR by another user. Prefer to avoid.`);
        continue;
      }
      filteredIssues.push(issue);
    }

    return { status: "success", issues: filteredIssues };
  }
});
