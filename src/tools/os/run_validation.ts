import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { exec } from "node:child_process";

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
    
    try {
      console.log(`Executing validation: ${commands.join(", ")}`);

      const promises = commands.map(cmd => {
        return new Promise<any>((resolve) => {
          exec(cmd, { cwd: ctx.repoDir, timeout: 300000 }, (error, stdout, stderr) => {
            if (error) {
              const exitCode = typeof (error as any).code === "number" ? (error as any).code : 1;
              ctx.recordValidationResult(cmd, exitCode);
              if ((error as any).killed && (error as any).signal === 'SIGTERM') {
                resolve({ command: cmd, status: "failed", error: "Command timed out after 5 minutes." });
              } else {
                resolve({ command: cmd, status: "failed", error: error.message, stdout, stderr });
              }
            } else {
              ctx.recordValidationResult(cmd, 0);
              resolve({ command: cmd, status: "passed", output: stdout });
            }
          });
        });
      });

      const results = await Promise.all(promises);

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
