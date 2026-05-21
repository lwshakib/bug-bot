import { Type } from "@google/genai";
import { defineTool, activeCommands } from "../utils.js";
import type { CommandSession } from "../utils.js";
import { spawn } from "node:child_process";

export const startBackgroundCommandTool = defineTool({
  declaration: {
    name: "start_background_command",
    description: "Starts a long-running shell command in the background (e.g. 'npm install', 'npm run build'). Returns a command_id that you must use to check status.",
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
    const commandId = Math.random().toString(36).substring(7);
    const child = spawn(command, { shell: true, cwd: ctx.repoDir });
    
    const session: CommandSession = {
      process: child,
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
