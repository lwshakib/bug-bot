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
    const prs = res.data.map(p => ({ number: p.number, title: p.title, head: p.head.ref }));
    return { status: "success", prs };
  }
});
