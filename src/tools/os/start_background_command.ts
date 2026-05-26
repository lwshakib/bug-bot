import { Type } from "@google/genai";
import { defineTool, activeCommands, isGlobalPackageInstallCommand, isBroadRecursiveSearchCommand, ensureValidPnpmWorkspace } from "../utils.js";
import type { CommandSession } from "../utils.js";
import { spawn } from "node:child_process";

export const startBackgroundCommandTool = defineTool({
  declaration: {
    name: "start_background_command",
    description: "Starts a long-running shell command in the background (e.g. 'npm install', 'npm run build'). Returns a command_id that you must use to check status.",
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
    if (isBroadRecursiveSearchCommand(command)) {
      return {
        status: "error",
        message: "Broad recursive shell searches are not allowed through start_background_command. Use search_code for repository searches, or list_files/read_file for targeted inspection."
      };
    }

    let finalCommand = command;
    if (/\b(?:pnpm|yarn)\b/i.test(command) && !/\bcorepack enable\b/i.test(command)) {
      finalCommand = `corepack enable && ${command}`;
    }

    const isValidation = is_validation === true || /\b(?:build|lint|format|typecheck|test|check|validate)\b/i.test(command);
    ensureValidPnpmWorkspace(ctx.repoDir);
    const commandId = Math.random().toString(36).substring(7);
    const child = spawn(finalCommand, {
      shell: true,
      cwd: ctx.repoDir,
      env: { ...process.env, pnpm_config_dangerously_allow_all_builds: "true" }
    });
    
    const session: CommandSession = {
      process: child,
      command: finalCommand,
      isValidation: isValidation,
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
    
    activeCommands.set(commandId, session);
    return { status: "success", command_id: commandId, message: "Command started in background. Use check_command_status to monitor." };
  }
});
