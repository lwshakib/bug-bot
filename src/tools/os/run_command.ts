import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { execSync } from "node:child_process";

export const runCommandTool = defineTool({
  declaration: {
    name: "run_command",
    description: "Executes an arbitrary shell command in the repository directory. Use this for installing packages, running custom tests, or project-specific CLI tools.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, description: "The shell command to execute." }
      },
      required: ["command"]
    }
  },
  execute: async ({ command }: { command: string }, ctx) => {
    if (!ctx.repoDir) return { status: "skipped", reason: "No repository cloned" };
    try {
      console.log(`Running CLI command: ${command}`);
      const output = execSync(command, { cwd: ctx.repoDir, stdio: "pipe", encoding: "utf8", timeout: 300000 });
      return { status: "success", output };
    } catch (e: any) {
      if (e.code === 'ETIMEDOUT') return { status: "failure", error: "Command timed out after 5 minutes. For long-running tasks, use start_background_command." };
      return { status: "failure", error: e.message, stdout: e.stdout, stderr: e.stderr };
    }
  }
});
