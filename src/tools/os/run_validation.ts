import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { execSync } from "node:child_process";

export const runValidationTool = defineTool({
  declaration: {
    name: "run_validation",
    description: "Executes validation commands to ensure the fix is correct. You MUST inspect the repository (package manager, Makefile, CI scripts) to determine the exact commands to run (e.g., 'pnpm run build', 'pytest', etc.).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        commands: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }, 
          description: "List of specific validation commands to run." 
        }
      },
      required: ["commands"]
    }
  },
  execute: async ({ commands }: { commands: string[] }, ctx) => {
    if (!ctx.repoDir) return { status: "skipped", reason: "No repository cloned" };
    if (!commands || commands.length === 0) return { status: "error", message: "You must provide specific validation commands." };
    
    const results: any[] = [];
    try {
      console.log(`Executing validation: ${commands.join(", ")}`);

      for (const cmd of commands) {
        try {
          const output = execSync(cmd, { cwd: ctx.repoDir, stdio: "pipe", encoding: "utf8", timeout: 300000 });
          results.push({ command: cmd, status: "passed", output });
        } catch (e: any) {
          if (e.code === 'ETIMEDOUT') {
            results.push({ command: cmd, status: "failed", error: "Command timed out after 5 minutes." });
          } else {
            results.push({ command: cmd, status: "failed", error: e.message, stdout: e.stdout, stderr: e.stderr });
          }
        }
      }

      const allPassed = results.every(r => r.status !== "failed");
      return { 
        status: allPassed ? "success" : "failure", 
        message: allPassed ? "All validation checks passed." : "CRITICAL: ONE OR MORE VALIDATION CHECKS FAILED. YOU MUST FIX THESE ERRORS BEFORE CREATING A PULL REQUEST.",
        checks: results 
      };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  }
});
