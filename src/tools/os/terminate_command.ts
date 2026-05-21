import { Type } from "@google/genai";
import { defineTool, activeCommands } from "../utils.js";

export const terminateCommandTool = defineTool({
  declaration: {
    name: "terminate_command",
    description: "Kills a background command if it is stuck or no longer needed.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command_id: { type: Type.STRING, description: "The ID returned by start_background_command." }
      },
      required: ["command_id"]
    }
  },
  execute: async ({ command_id }: { command_id: string }) => {
    const session = activeCommands.get(command_id);
    if (!session) return { status: "error", message: `Command ID ${command_id} not found.` };
    
    if (session.exitCode === null) {
      session.process.kill();
      return { status: "success", message: "Command terminated." };
    } else {
      return { status: "skipped", message: "Command already finished." };
    }
  }
});
