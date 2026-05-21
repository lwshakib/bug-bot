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
    const res = await ctx.octokit.rest.issues.listForRepo({ owner, repo, state: "open" });
    const issues = res.data.map(i => ({ number: i.number, title: i.title, body: i.body, url: i.html_url }));
    return { status: "success", issues };
  }
});
