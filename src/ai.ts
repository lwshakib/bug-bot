import { readFileSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { genAI, octokit } from "./client.js";
import { githubToken } from "./env.js";
import { 
  AGENTIC_REASONING_INSTRUCTION, 
  ISSUE_AGENT_SYSTEM_INSTRUCTION, 
  PR_AGENT_SYSTEM_INSTRUCTION,
  FIX_GENERATION_SYSTEM_INSTRUCTION 
} from "./prompts.js";
import { toolDefinitions, createHandlers, terminateAllCommands } from "./tools.js";
import type { ToolContext } from "./tools.js";
import { 
  MAX_TOOL_CALLS, 
  MAX_TOOL_RETRIES, 
  MAX_NETWORK_RETRIES,
  RETRY_NETWORK_DELAY,
  RETRY_429_DELAY_1, 
  RETRY_429_DELAY_2, 
  RETRY_429_DELAY_3,
  RETRY_503_BURST_COUNT,
  RETRY_503_BURST_DELAY,
  RETRY_503_LONG_DELAY,
  TOOL_RETRY_DELAY,
  AI_RECOVERY_WAIT_TIME,
  SESSION_TIMEOUT_MS,
  DEFAULT_MODEL_ID
} from "./constants.js";

function pickRandom<T>(items: T[]): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index]!;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isInputError = (message: string): boolean => {
  const lower = message.toLowerCase();
  return [
    "invalid", "not found", "swapped", "missing", "range", 
    "argument", "unexpected", "forbidden", "permission denied"
  ].some(keyword => lower.includes(keyword));
};

export async function runBugAgent(agentType: "ISSUE" | "PR" = "ISSUE", repoName?: string, sessionStartTime: number = Date.now()) {
  const reposPath = join(process.cwd(), "repositories.json");
  const repos = JSON.parse(readFileSync(reposPath, "utf8")) as string[];
  const selected = repoName || pickRandom(repos);

  console.log(`\n--- [${agentType} AGENT] Starting work on: ${selected} ---`);

  // Shared state for tools
  let state = {
    workRoot: "",
    repoDir: "",
    visitedRepos: [] as string[],
    issuesCreated: [] as string[],
    prsCreated: [] as { url: string; issueNumber?: number; issueUrl?: string }[],
    errorsHandled: [] as string[],
    networkRetryCount: 0
  };

  const ctx: ToolContext = {
    githubToken,
    octokit,
    get workRoot() { return state.workRoot; },
    get repoDir() { return state.repoDir; },
    get visitedRepos() { return state.visitedRepos; },
    setWorkRoot: (dir) => state.workRoot = dir,
    setRepoDir: (dir) => state.repoDir = dir,
    addVisitedRepo: (repo) => {
      if (!state.visitedRepos.includes(repo)) state.visitedRepos.push(repo);
    },
    terminateAllCommands
  };

  ctx.addVisitedRepo(selected);

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
      // Check for session timeout
      const elapsed = Date.now() - sessionStartTime;
      if (elapsed >= SESSION_TIMEOUT_MS) {
        console.log(`[TIMEOUT] Session exceeded ${SESSION_TIMEOUT_MS / 3600000} hour(s). Terminating.`);
        const emailHandler = handlers["send_email"];
        if (emailHandler) {
          await emailHandler({
            subject: "Agent Session Timeout",
            html: `The agent session has been terminated because it exceeded the allowed duration of <b>${SESSION_TIMEOUT_MS / 3600000} hour(s)</b>.<br><br>Repostiory being processed: <b>${selected}</b>`
          });
        }
        process.exit(0); // Exit gracefully after notification
      }

      let result: any;
      let retryCount429 = 0;
      let retryCount503 = 0;

      // Outer loop for API-level retries (429, 503)
      while (true) {
        try {
          result = await genAI.models.generateContent({
            model: DEFAULT_MODEL_ID,
            contents: [...history, { role: "user", parts: [{ text: typeof message === "string" ? message : JSON.stringify(message) }] }],
            config: { 
              systemInstruction,
              tools: toolDefinitions 
            }
          });
          break; // Success
        } catch (error: any) {
          const status = error?.status || 0;
          const isNetworkError = !status || status === 0 || error.message?.includes("fetch failed") || ["ECONNABORTED", "ECONNRESET", "ETIMEDOUT"].some(code => error.stack?.includes(code) || error.message?.includes(code));

          if (status === 429) {
            retryCount429++;
            if (retryCount429 > 3) {
              console.error("[FATAL] Rate limit exhausted after 3 retries. Terminating session.");
              const emailHandler = handlers["send_email"];
              if (emailHandler) {
                await emailHandler({
                  subject: "Agent Terminated: Rate Limit Exhausted",
                  html: `The agent has been terminated because the Gemini API rate limit was consistently exceeded for <b>${selected}</b>.<br><br>Final Wait duration before exit: 5 minutes.`
                });
              }
              process.exit(1); 
            }
            const delay = retryCount429 === 1 ? RETRY_429_DELAY_1 : retryCount429 === 2 ? RETRY_429_DELAY_2 : RETRY_429_DELAY_3;
            console.log(`[429] Rate limited. Retry ${retryCount429}/3. Waiting ${delay/1000}s...`);
            await sleep(delay);
          } else if (status === 503) {
            retryCount503++;
            if (retryCount503 > (RETRY_503_BURST_COUNT * 3)) throw error;
            const delay = retryCount503 <= RETRY_503_BURST_COUNT ? RETRY_503_BURST_DELAY : RETRY_503_LONG_DELAY;
            console.log(`[503] Service Unavailable. Retry ${retryCount503}. Waiting ${delay/1000}s...`);
            await sleep(delay);
          } else if (isNetworkError) {
            if (state.networkRetryCount < MAX_NETWORK_RETRIES) {
              state.networkRetryCount++;
              console.log(`[NETWORK ERROR] ${error.message}. Retrying in ${RETRY_NETWORK_DELAY/1000}s (${state.networkRetryCount}/${MAX_NETWORK_RETRIES})...`);
              await sleep(RETRY_NETWORK_DELAY);
            } else {
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
          
          let callDetails = "";
          if (call.args.command) callDetails = ` (${call.args.command})`;
          else if (call.args.file_path) callDetails = ` (${call.args.file_path})`;
          else if (call.args.repo_name) callDetails = ` (${call.args.repo_name})`;
          else if (call.args.command_id) callDetails = ` (${call.args.command_id})`;

          console.log(`[${toolCallCount}] Running tool: ${call.name}${callDetails}`);
          
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
                
                // Enhanced results logging
                if (call.name === "list_files" && toolResult.fileList) {
                  const files = toolResult.fileList.split("\n");
                  const snippet = files.slice(0, 5).join(", ");
                  console.log(`  - Found ${files.length} files. Snippet: [${snippet}${files.length > 5 ? ", ..." : ""}]`);
                }

                // Track successful creations
                if (call.name === "create_github_issue" && toolResult.url) {
                  state.issuesCreated.push(toolResult.url);
                }
                if (call.name === "create_pull_request" && toolResult.url) {
                  state.prsCreated.push({ 
                    url: toolResult.url, 
                    issueNumber: call.args.issue_number,
                    issueUrl: call.args.issue_url
                  });
                }

                // Handle Hopping
                if (call.name === "hop_to_next_repo" && toolResult.action === "HOP_REQUESTED") {
                  console.log(`[HOP] Moving to next repository: ${toolResult.next_repo}`);
                  
                  // 1. Cleanup current repo
                  if (state.workRoot) {
                    try { rmSync(state.workRoot, { recursive: true, force: true }); } catch (e) {}
                  }
                  
                  // 2. Set new repo state
                  state.repoDir = "";
                  state.workRoot = "";
                  ctx.addVisitedRepo(toolResult.next_repo);
                  
                  // 3. Clone the new one immediately so next tools work
                  const cloneHandler = handlers["clone_repository"];
                  if (cloneHandler) {
                    const cloneRes = await cloneHandler({ repo_name: toolResult.next_repo });
                    toolResult.clone_status = cloneRes.status;
                  }
                }
                
                break; // Tool success
              } catch (e: any) {
                const inputError = isInputError(e.message);
                if (inputError) {
                  console.log(`[INPUT ERROR] ${call.name}: ${e.message}. Skipping retries.`);
                  toolResult = { status: "error", message: `Tool ${call.name} failed with an input error: ${e.message}. Please correct your arguments and try again.` };
                  break; 
                }

                toolRetries++;
                state.errorsHandled.push(`[${call.name}] ${e.message}`);
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

    return {
      repo: selected,
      issuesCreated: state.issuesCreated,
      prsCreated: state.prsCreated,
      errors: state.errorsHandled,
      duration: Date.now() - sessionStartTime
    };
  } catch (error: any) {
    console.error(`Session failure on ${selected}:`, error);
    const emailHandler = handlers["send_email"];
    if (emailHandler) {
      await emailHandler({
        subject: `Agent Session Failure: ${selected}`,
        html: `The agent session crashed on repository <b>${selected}</b>.<br><br><b>Reason:</b> ${error.message}`
      });
    }
    return {
      repo: selected,
      issuesCreated: [],
      prsCreated: [],
      errors: [error.message],
      duration: Date.now() - sessionStartTime
    };
  } finally {
    terminateAllCommands();
    if (state.workRoot) {
      // Small delay for handles to release on Windows
      await sleep(500);
      let cleanupRetries = 0;
      while (cleanupRetries < 3) {
        try {
          rmSync(state.workRoot, { recursive: true, force: true });
          break;
        } catch (e) {
          cleanupRetries++;
          if (cleanupRetries === 3) {
            console.error(`[CLEANUP] Final failure to remove ${state.workRoot}:`, e);
          } else {
            console.log(`[CLEANUP] Retry ${cleanupRetries}/3 after EBUSY...`);
            await sleep(2000);
          }
        }
      }
    }
  }
}

export async function cloneRepositoryInternal(ctx: ToolContext, repo_name: string) {
  const workRoot = mkdtempSync(join(tmpdir(), "repo-agent-"));
  const repoDir = join(workRoot, "repo");
  ctx.setWorkRoot(workRoot);
  ctx.setRepoDir(repoDir);

  try {
    let url = repo_name.includes("://") ? repo_name : `https://github.com/${repo_name}.git`;
    if (ctx.githubToken && url.startsWith("https://github.com/")) {
      url = url.replace("https://github.com/", `https://x-access-token:${ctx.githubToken}@github.com/`);
    }
  } catch (e) {
    rmSync(workRoot, { recursive: true, force: true });
    throw e;
  }
}