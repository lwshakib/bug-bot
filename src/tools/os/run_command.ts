import { Type } from "@google/genai";
import { 
  defineTool, 
  isBroadRecursiveSearchCommand,
  isDependencyInstallCommand,
  isGlobalPackageInstallCommand,
  isShellFileMutationCommand
} from "../utils.js";
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
    if (isGlobalPackageInstallCommand(command)) {
      return {
        status: "error",
        message: "Global package manager installation is not allowed. Use the package manager already selected by the repository lockfile, use corepack if available, or report a setup limitation instead of mutating the global environment."
      };
    }
    if (isDependencyInstallCommand(command)) {
      return {
        status: "error",
        message: "Dependency installation commands must use start_background_command, not run_command. Start the install in the background, continue independent work if possible, then monitor it with wait_for_command or check_command_status."
      };
    }
    if (isShellFileMutationCommand(command)) {
      return {
        status: "error",
        message: "Shell-based file mutation is not allowed through run_command. Use read_file and replace_lines so edits are tracked, reviewed, and validated before PR creation."
      };
    }
    if (isBroadRecursiveSearchCommand(command)) {
      return {
        status: "error",
        message: "Broad recursive shell searches are not allowed through run_command. Use search_code for repository searches, or list_files/read_file for targeted inspection."
      };
    }
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
