import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { genAI, octokit } from "./client.js";
import { githubToken } from "./env.js";
import { 
  AGENTIC_REASONING_INSTRUCTION, 
  ISSUE_AGENT_SYSTEM_INSTRUCTION, 
  PR_AGENT_SYSTEM_INSTRUCTION,
  FIX_GENERATION_SYSTEM_INSTRUCTION 
} from "./prompts.js";
import { toolDefinitions, createHandlers } from "./tools.js";
import type { ToolContext } from "./tools.js";
import { 
  MAX_TOOL_CALLS, 
  MAX_TOOL_RETRIES, 
  RETRY_429_DELAY_1, 
  RETRY_429_DELAY_2, 
  RETRY_429_DELAY_3,
  RETRY_503_BURST_COUNT,
  RETRY_503_BURST_DELAY,
  RETRY_503_LONG_DELAY,
  TOOL_RETRY_DELAY,
  AI_RECOVERY_WAIT_TIME
} from "./constants.js";

function pickRandom<T>(items: T[]): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index]!;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runBugAgent(agentType: "ISSUE" | "PR" = "ISSUE", repoName?: string) {
  const reposPath = join(process.cwd(), "repositories.json");
  const repos = JSON.parse(readFileSync(reposPath, "utf8")) as string[];
  const selected = repoName || pickRandom(repos);

  console.log(`\n--- [${agentType} AGENT] Starting work on: ${selected} ---`);

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

  try {
    let toolCallCount = 0;
    
    const persona = agentType === "ISSUE" ? ISSUE_AGENT_SYSTEM_INSTRUCTION : PR_AGENT_SYSTEM_INSTRUCTION;
    
    const systemInstruction = `
${AGENTIC_REASONING_INSTRUCTION}

---
Specific Goals for this session on ${selected}:
${agentType === "ISSUE" ? "Find and report UNIQUE issues. Use 'list_issues' first." : "Find an open issue and FIX it. Use 'list_issues' to find a target."}

${persona}
${FIX_GENERATION_SYSTEM_INSTRUCTION}`;

    const history: any[] = [];
    let message: any = `Start the workflow for ${selected}`;

    while (toolCallCount < MAX_TOOL_CALLS) {
      let result: any;
      let retryCount429 = 0;
      let retryCount503 = 0;

      // Outer loop for API-level retries (429, 503)
      while (true) {
        try {
          result = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [...history, { role: "user", parts: [{ text: typeof message === "string" ? message : JSON.stringify(message) }] }],
            config: { 
              systemInstruction,
              tools: toolDefinitions 
            }
          });
          break; // Success
        } catch (error: any) {
          const status = error?.status || 0;
          
          if (status === 429) {
            retryCount429++;
            if (retryCount429 === 1) {
              console.log(`[429] Rate limited. Retrying in ${RETRY_429_DELAY_1/1000}s...`);
              await sleep(RETRY_429_DELAY_1);
            } else if (retryCount429 === 2) {
              console.log(`[429] Rate limited. Retrying in ${RETRY_429_DELAY_2/1000}s...`);
              await sleep(RETRY_429_DELAY_2);
            } else if (retryCount429 === 3) {
              console.log(`[429] Rate limited. Retrying in ${RETRY_429_DELAY_3/1000}s...`);
              await sleep(RETRY_429_DELAY_3);
            } else {
              const emailHandler = handlers["send_email"];
              if (emailHandler) {
                await emailHandler({
                  subject: `Rate Limit Exceeded: ${selected}`,
                  html: `Agent hit persistent 429 error on <b>${selected}</b>. Session paused.`
                });
              }
              throw error;
            }
          } else if (status === 503) {
            retryCount503++;
            if (retryCount503 <= RETRY_503_BURST_COUNT) {
              console.log(`[503] Service Unavailable. Retry ${retryCount503}/${RETRY_503_BURST_COUNT}...`);
              await sleep(RETRY_503_BURST_DELAY);
            } else if (retryCount503 <= (RETRY_503_BURST_COUNT * 2)) {
              console.log(`[503] Still down. Waiting ${RETRY_503_LONG_DELAY/1000}s...`);
              await sleep(RETRY_503_LONG_DELAY);
            } else if (retryCount503 <= (RETRY_503_BURST_COUNT * 3)) {
              console.log(`[503] Final attempt cycle. Waiting ${RETRY_503_LONG_DELAY/1000}s...`);
              await sleep(RETRY_503_LONG_DELAY);
            } else {
              const emailHandler = handlers["send_email"];
              if (emailHandler) {
                await emailHandler({
                  subject: `Service Unavailable: ${selected}`,
                  html: `Agent hit persistent 503 error on <b>${selected}</b>. Session paused.`
                });
              }
              throw error;
            }
          } else {
            throw error;
          }
        }
      }

      const candidate = result.candidates?.[0];
      if (!candidate?.content) break;

      history.push({ role: "user", parts: [{ text: typeof message === "string" ? message : JSON.stringify(message) }] });
      history.push(candidate.content);

      if (candidate.content.parts?.some((p: any) => p.functionCall)) {
        const responseParts: any[] = [];
        for (const part of candidate.content.parts) {
          if (!part.functionCall) continue;
          
          const call = part.functionCall;
          toolCallCount++;
          console.log(`[${toolCallCount}] Running tool: ${call.name}`);
          
          let toolResult: any;
          let toolRetries = 0;

          const handler = handlers[call.name];
          if (!handler) {
            toolResult = { status: "error", message: `Tool handler not found: ${call.name}` };
          } else {
            while (toolRetries < MAX_TOOL_RETRIES) {
              try {
                toolResult = await handler(call.args);
                if (toolResult.status === "error") throw new Error(toolResult.message);
                break; // Tool success
              } catch (e: any) {
                toolRetries++;
                console.error(`Tool error (${call.name}): ${e.message}. Retry ${toolRetries}/${MAX_TOOL_RETRIES}`);
                await sleep(TOOL_RETRY_DELAY);
                if (toolRetries === MAX_TOOL_RETRIES) {
                  console.log(`Tool ${call.name} exhausted retries. Passing error back to AI.`);
                  toolResult = { 
                    status: "error", 
                    message: `Tool ${call.name} failed after ${MAX_TOOL_RETRIES} attempts. Error: ${e.message}. If this is a transient network/API error, you should wait ${AI_RECOVERY_WAIT_TIME} and try again. If it is an input error, correct your arguments.` 
                  };
                }
              }
            }
          }
          
          responseParts.push({
            functionResponse: {
              name: call.name,
              response: toolResult,
            },
          });
        }
        message = responseParts;
      } else {
        console.log("Agent Message:", candidate.content.parts?.[0]?.text || "Finished.");
        break;
      }
    }

    if (toolCallCount >= MAX_TOOL_CALLS) {
      console.log("Safety limit reached. Stopping.");
    }
  } catch (error: any) {
    console.error(`Session failure on ${selected}:`, error);
    const emailHandler = handlers["send_email"];
    if (emailHandler) {
      await emailHandler({
        subject: `Agent Session Failure: ${selected}`,
        html: `The agent session crashed on repository <b>${selected}</b>.<br><br><b>Reason:</b> ${error.message}`
      });
    }
  } finally {
    if (state.workRoot) {
      try {
        rmSync(state.workRoot, { recursive: true, force: true });
      } catch (e) {
        console.error("Failed to cleanup workRoot:", e);
      }
    }
  }
}
