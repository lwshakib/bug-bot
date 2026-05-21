import { Type } from "@google/genai";
import { defineTool, activeCommands } from "../utils.js";

export const waitForCommandTool = defineTool({
  declaration: {
    name: "wait_for_command",
    description: "Waits for a background command to complete or for a timeout to occur. Returns early if the command finishes before the timeout. Use this to avoid spamming check_command_status.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command_id: { type: Type.STRING, description: "The ID returned by start_background_command." },
        timeout_seconds: { type: Type.NUMBER, description: "The maximum time to wait in seconds. For example, 30 for small tasks, 120 for builds." }
      },
      required: ["command_id", "timeout_seconds"]
    }
  },
  execute: async ({ command_id, timeout_seconds }: { command_id: string; timeout_seconds: number }) => {
    const session = activeCommands.get(command_id);
    if (!session) return { status: "error", message: `Command ID ${command_id} not found.` };
    
    const startTime = Date.now();
    const timeoutMs = timeout_seconds * 1000;
    
    // Poll every 2 seconds until the command finishes or the timeout is reached
    while (session.exitCode === null && (Date.now() - startTime) < timeoutMs) {
      await new Promise(r => setTimeout(r, 2000));
    }
    
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
