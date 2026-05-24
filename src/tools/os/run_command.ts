import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { execSync } from "node:child_process";

export const runCommandTool = defineTool({
  declaration: {
    name: "run_command",
    description: "Executes an arbitrary shell command in the repository directory. Use this for short project-specific CLI tools. For validation/check commands selected from the target repository's CI or scripts, set is_validation to true so the PR gate can observe the result.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, description: "The shell command to execute." },
        is_validation: { type: Type.BOOLEAN, description: "Set true only when this command is a validation/check command chosen from the target repository's CI or scripts." }
      },
      required: ["command"]
    }
  },
  execute: async ({ command, is_validation }: { command: string; is_validation?: boolean }, ctx) => {
    if (!ctx.repoDir) return { status: "skipped", reason: "No repository cloned" };
    try {
      console.log(`Running CLI command: ${command}`);
      const output = execSync(command, { cwd: ctx.repoDir, stdio: "pipe", encoding: "utf8", timeout: 300000 });
      if (is_validation === true) ctx.recordValidationResult(command, 0);
      return { status: "success", output };
    } catch (e: any) {
      if (is_validation === true) {
        const exitCode = typeof e.status === "number" ? e.status : 1;
        ctx.recordValidationResult(command, exitCode);
      }
      if (e.code === 'ETIMEDOUT') return { status: "failure", error: "Command timed out after 5 minutes. For long-running tasks, use start_background_command." };
      return { status: "failure", error: e.message, stdout: e.stdout, stderr: e.stderr };
    }
  }
});
