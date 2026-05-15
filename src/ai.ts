import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { genAI, octokit } from "./client.js";
import { githubToken } from "./env.js";
import { 
  AGENTIC_REASONING_INSTRUCTION, 
  BUG_DETECTION_SYSTEM_INSTRUCTION, 
  FIX_GENERATION_SYSTEM_INSTRUCTION 
} from "./prompts.js";
import { toolDefinitions, createHandlers } from "./tools.js";
import type { ToolContext } from "./tools.js";

function pickRandom<T>(items: T[]): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index]!;
}

export async function runBugAgent() {
  const reposPath = join(process.cwd(), "repositories.json");
  const repos = JSON.parse(readFileSync(reposPath, "utf8")) as string[];
  const selected = pickRandom(repos);

  console.log(`Agent starting work on: ${selected}`);

  // Shared state for tools
  let state = {
    workRoot: "",
    repoDir: "",
  };

  const ctx: ToolContext = {
    githubToken,
    octokit,
    get workRoot() { return state.workRoot; },
    get repoDir() { return state.repoDir; },
    setWorkRoot: (dir) => state.workRoot = dir,
    setRepoDir: (dir) => state.repoDir = dir,
  };

  const handlers: Record<string, (args: any) => Promise<any>> = createHandlers(ctx);
  const history: any[] = [];
  let toolCallCount = 0;
  const MAX_TOOL_CALLS = 15;
  
  const systemInstruction = `
${AGENTIC_REASONING_INSTRUCTION}

---
Specific Goals for this session on ${selected}:
1. Clone the repo.
2. Analyze the codebase for bugs and improvements.
3. Report findings by creating an issue.
4. Generate and apply fixes.
5. Validate the fixes.
6. Submit a Pull Request if validation passes.

${BUG_DETECTION_SYSTEM_INSTRUCTION}
${FIX_GENERATION_SYSTEM_INSTRUCTION}`;

  let message: any = `Start the workflow for ${selected}`;

  while (true) {
    if (toolCallCount >= MAX_TOOL_CALLS) {
      console.log("Max tool calls reached. Stopping agent to prevent loops.");
      break;
    }

    const response = await genAI.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [...history, { role: "user", parts: [{ text: typeof message === "string" ? message : JSON.stringify(message) }] }],
      config: { 
        systemInstruction,
        tools: toolDefinitions 
      }
    });

    const candidate = response.candidates?.[0];
    if (!candidate?.content) break;

    history.push({ role: "user", parts: [{ text: typeof message === "string" ? message : JSON.stringify(message) }] });
    history.push(candidate.content);

    if (response.functionCalls && response.functionCalls.length > 0) {
      const responseParts: any[] = [];
      for (const call of response.functionCalls) {
        if (!call.name) continue;
        toolCallCount++;
        console.log(`[${toolCallCount}] Running tool: ${call.name}`);
        const handler = handlers[call.name];
        if (handler) {
          const result = await handler(call.args);
          console.log(`Tool Result: ${result.status || "success"}`);
          responseParts.push({ functionResponse: { name: call.name, response: result } });
        } else {
          console.log(`Tool Error: Handler not found for ${call.name}`);
          responseParts.push({ functionResponse: { name: call.name, response: { status: "error", message: "Tool not found" } } });
        }
      }
      message = responseParts;
    } else {
      console.log("Agent Message:", response.text || "No message returned.");
      break;
    }
  }

  console.log("Agent finished task.");
  if (state.workRoot) rmSync(state.workRoot, { recursive: true, force: true });
}
