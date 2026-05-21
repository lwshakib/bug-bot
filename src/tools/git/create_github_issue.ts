import { Type } from "@google/genai";
import { defineTool } from "../utils.js";

export const createGithubIssueTool = defineTool({
  declaration: {
    name: "create_github_issue",
    description: "Creates an issue on the target repository.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        owner: { type: Type.STRING },
        repo: { type: Type.STRING },
        title: { type: Type.STRING },
        body: { type: Type.STRING },
        labels: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optional labels (e.g. ['bug', 'high-priority'])." }
      },
      required: ["owner", "repo", "title", "body"]
    }
  },
  execute: async ({ owner, repo, title, body, labels }: { owner: string; repo: string; title: string; body: string; labels?: string[] }, ctx) => {
    if (!ctx.octokit) return { status: "skipped", reason: "No GITHUB_TOKEN" };
    
    // Schema validation
    if (typeof title !== "string" || title.trim().length === 0 || title.length > 256) {
      return { status: "error", message: "Invalid title: must be a non-empty string under 256 characters." };
    }
    if (typeof body !== "string") {
      return { status: "error", message: "Invalid body: must be a string." };
    }
    if (labels !== undefined && (!Array.isArray(labels) || !labels.every(l => typeof l === "string"))) {
      return { status: "error", message: "Invalid labels: must be an array of strings." };
    }

    const res = await ctx.octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
      ...(labels !== undefined ? { labels } : {})
    });
    return { status: "success", url: res.data.html_url, number: res.data.number };
  }
});
