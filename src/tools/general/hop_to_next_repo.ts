import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const hopToNextRepoTool = defineTool({
  declaration: {
    name: "hop_to_next_repo",
    description: "Switches the current focus to another repository from the list that has not yet been processed in this session.",
    parameters: { type: Type.OBJECT, properties: {} }
  },
  execute: async (_, ctx) => {
    const reposPath = join(process.cwd(), "repositories.json");
    if (!existsSync(reposPath)) return { status: "error", message: "repositories.json not found" };
    
    const repos = JSON.parse(readFileSync(reposPath, "utf8")) as string[];
    const available = repos.filter(r => !ctx.visitedRepos.includes(r));
    
    if (available.length === 0) {
      return { status: "success", action: "FINISH", message: "All repositories in the portfolio have been processed." };
    }

    // Pick a new random repo from available
    const next = available[Math.floor(Math.random() * available.length)]!;
    return { status: "success", action: "HOP_REQUESTED", next_repo: next };
  }
});
