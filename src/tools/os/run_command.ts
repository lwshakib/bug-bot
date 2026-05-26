import { Type } from "@google/genai";
import { 
  defineTool, 
  isBroadRecursiveSearchCommand,
  isDependencyInstallCommand,
  isGlobalPackageInstallCommand,
  isShellFileMutationCommand,
  ensureValidPnpmWorkspace
} from "../utils.js";
import type { CommandSession } from "../utils.js";
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
      console.log(`[AUTOROUTE] Automatically redirecting dependency install command to background execution: ${command}`);
      const commandId = Math.random().toString(36).substring(7);
      
      // Auto-prepend corepack enable if it uses pnpm/yarn
      let finalCommand = command;
      if (/\b(?:pnpm|yarn)\b/i.test(command) && !/\bcorepack enable\b/i.test(command)) {
        finalCommand = `corepack enable && ${command}`;
      }

      const { spawn } = await import("node:child_process");
      const child = spawn(finalCommand, {
        shell: true,
        cwd: ctx.repoDir,
        env: { ...process.env, pnpm_config_dangerously_allow_all_builds: "true" }
      });
      
      const session: CommandSession = {
        process: child,
        command: finalCommand,
        isValidation: false,
        stdout: "",
        stderr: "",
        exitCode: null,
        startTime: Date.now()
      };
      
      child.stdout?.on("data", (data) => session.stdout += data.toString());
      child.stderr?.on("data", (data) => session.stderr += data.toString());
      child.on("close", (code) => session.exitCode = code);
      child.on("error", (err) => {
        session.exitCode = 1;
        session.stderr += `\nFailed to start command: ${err.message}\n`;
      });
      
      const { activeCommands } = await import("../utils.js");
      activeCommands.set(commandId, session);
      return { 
        status: "success", 
        command_id: commandId, 
        message: `Dependency installation command was automatically redirected to background execution to prevent blocking the session. Please use wait_for_command or check_command_status with command_id: "${commandId}" to monitor progress.` 
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

    const isValidation = is_validation === true || /\b(?:build|lint|format|typecheck|test|check|validate)\b/i.test(command);
    let finalCommand = command;
    if (/\b(?:pnpm|yarn)\b/i.test(command) && !/\bcorepack enable\b/i.test(command)) {
      finalCommand = `corepack enable && ${command}`;
    }

    ensureValidPnpmWorkspace(ctx.repoDir);
    try {
      console.log(`Running CLI command: ${finalCommand}`);
      const output = execSync(finalCommand, {
        cwd: ctx.repoDir,
        stdio: "pipe",
        encoding: "utf8",
        timeout: 300000,
        env: { ...process.env, pnpm_config_dangerously_allow_all_builds: "true" }
      });
      ensureValidPnpmWorkspace(ctx.repoDir);
      if (isValidation) ctx.recordValidationResult(command, 0);
      return { status: "success", output };
    } catch (e: any) {
      ensureValidPnpmWorkspace(ctx.repoDir);
      if (isValidation) {
        const exitCode = typeof e.status === "number" ? e.status : 1;
        ctx.recordValidationResult(command, exitCode);
      }
      if (e.code === 'ETIMEDOUT') return { status: "failure", error: "Command timed out after 5 minutes. For long-running tasks, use start_background_command." };
      return { status: "failure", error: e.message, stdout: e.stdout, stderr: e.stderr };
    }
  }
});
