import { Type } from "@google/genai";
import { defineTool, run } from "../utils.js";

export const searchCodeTool = defineTool({
  declaration: {
    name: "search_code",
    description: "Searches for a specific string or pattern across all source files (grep).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "The string or regex to search for." }
      },
      required: ["query"]
    }
  },
  execute: async ({ query }: { query: string }, ctx) => {
    try {
      const results = run(`git grep -nI "${query}"`, ctx.repoDir);
      return { status: "success", results };
    } catch (e) {
      return { status: "success", message: "No matches found." };
    }
  }
});
