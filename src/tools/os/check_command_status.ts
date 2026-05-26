import { Type } from "@google/genai";
import { defineTool, activeCommands, ensureValidPnpmWorkspace } from "../utils.js";

export const checkCommandStatusTool = defineTool({
  declaration: {
    name: "check_command_status",
    description: "Checks the output and status of a background command using its command_id. Returns stdout, stderr, and whether it is still running.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command_id: { type: Type.STRING, description: "The ID returned by start_background_command." }
      },
      required: ["command_id"]
    }
  },
  execute: async ({ command_id }: { command_id: string }, ctx) => {
    const session = activeCommands.get(command_id);
    if (!session) return { status: "error", message: `Command ID ${command_id} not found.` };
    if (session.exitCode !== null && session.isValidation) {
      ctx.recordValidationResult(session.command, session.exitCode);
    }
    ensureValidPnpmWorkspace(ctx.repoDir);
    
    return {
      status: "success",
      isRunning: session.exitCode === null,
      exitCode: session.exitCode,
      stdout: session.stdout,
      stderr: session.stderr,
      durationSeconds: Math.floor((Date.now() - session.startTime) / 1000)
    };
  }
});
