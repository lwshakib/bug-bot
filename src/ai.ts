import { readFileSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { genAI, octokit } from "./client.js";
import { githubToken, isProduction } from "./env.js";
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
  MAX_NETWORK_RETRIES,
  RETRY_NETWORK_DELAY,
  RETRY_429_DELAY_1, 
  RETRY_429_DELAY_2, 
  RETRY_429_DELAY_3,
  RETRY_503_BURST_COUNT,
  RETRY_503_BURST_DELAY,
  RETRY_503_LONG_DELAY,
  SESSION_TIMEOUT_MS,
  DEFAULT_MODEL_ID,
  MAX_CONTEXT_WINDOW_TOKENS
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

interface RepoAuditStats {
  repo: string;
  issuesCreated: string[];
  advisoryEmailsSent: number;
  otherEmailsSent: number;
}

export async function runBugAgent(agentType: "ISSUE" | "PR" = "ISSUE", repoName?: string, sessionStartTime: number = Date.now()) {
  const reposPath = join(process.cwd(), "repositories.json");
  const repos = JSON.parse(readFileSync(reposPath, "utf8")) as string[];
  const selected = repoName || pickRandom(repos);

  console.log(`\n--- [${agentType} AGENT] Starting work on: ${selected} ---`);

  // Shared state for tools
  let state = {
    workRoot: "",
    repoDir: "",
    activeRepo: selected,
    visitedRepos: [] as string[],
    repoStats: new Map<string, RepoAuditStats>(),
    issuesCreated: [] as string[],
    prsCreated: [] as { url: string; issueNumber?: number; issueUrl?: string }[],
    errorsHandled: [] as string[],
    networkRetryCount: 0,
    hasUnvalidatedChanges: false,
    validationFailures: [] as string[],
    validationPasses: [] as string[]
  };

  const getRepoStats = (repo: string): RepoAuditStats => {
    const existing = state.repoStats.get(repo);
    if (existing) return existing;
    const stats: RepoAuditStats = {
      repo,
      issuesCreated: [],
      advisoryEmailsSent: 0,
      otherEmailsSent: 0
    };
    state.repoStats.set(repo, stats);
    return stats;
  };

  const ctx: ToolContext = {
    githubToken,
    octokit,
    get workRoot() { return state.workRoot; },
    get repoDir() { return state.repoDir; },
    get visitedRepos() { return state.visitedRepos; },
    get hasUnvalidatedChanges() { return state.hasUnvalidatedChanges; },
    get validationFailures() { return state.validationFailures; },
    get validationPasses() { return state.validationPasses; },
    setWorkRoot: (dir) => state.workRoot = dir,
    setRepoDir: (dir) => state.repoDir = dir,
    addVisitedRepo: (repo) => {
      if (!state.visitedRepos.includes(repo)) state.visitedRepos.push(repo);
      state.activeRepo = repo;
      getRepoStats(repo);
    },
    markFilesChanged: () => {
      state.hasUnvalidatedChanges = true;
      state.validationFailures = [];
      state.validationPasses = [];
    },
    recordValidationResult: (command, exitCode) => {
      const cleanCommand = command.replace(/^corepack\s+enable\s+&&\s+/i, "");
      // Filter out stale runs of the same command to prevent older failures from blocking new passes
      state.validationPasses = state.validationPasses.filter(entry => !entry.startsWith(`${cleanCommand} exited with `));
      state.validationFailures = state.validationFailures.filter(entry => !entry.startsWith(`${cleanCommand} exited with `));

      const entry = `${cleanCommand} exited with ${exitCode}`;
      if (exitCode === 0) {
        state.validationPasses.push(entry);
        
        // 1. If this is a comprehensive tool call (like run_validation), it validates everything. Clear all previous failures!
        // 2. If the successful command is a chained validation or runs all tasks, clear all previous failures.
        // 3. If the successful command is a superset of a failed command, clear that failed command.
        const isComprehensive = cleanCommand === "run_validation" || 
          (/\b(?:build|lint|typecheck|format)\b/i.test(cleanCommand) && /\b(?:and|&&|;)\b/i.test(cleanCommand)) ||
          (cleanCommand.includes("turbo") && ["build", "lint", "typecheck"].every(word => cleanCommand.includes(word)));

        if (isComprehensive) {
          console.log(`[VALIDATION SUCCESS] Comprehensive validation passed: "${cleanCommand}". Clearing all previous failures.`);
          state.validationFailures = [];
        } else {
          state.validationFailures = state.validationFailures.filter(failEntry => {
            const failCmd = failEntry.split(" exited with ")[0];
            if (!failCmd) return true;
            return !cleanCommand.includes(failCmd);
          });
        }
      } else {
        state.validationFailures.push(entry);
      }
      state.hasUnvalidatedChanges = state.validationPasses.length === 0 || state.validationFailures.length > 0;
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
              html: `The agent session has been terminated because it exceeded the allowed duration of <b>${SESSION_TIMEOUT_MS / 3600000} hour(s)</b>.<br><br>Repository being processed: <b><a href="https://github.com/${selected}">${selected}</a></b><br><br><b>What to Do Now / How to Solve This:</b> You can increase the <code>SESSION_TIMEOUT_MS</code> value in <code>src/constants.ts</code>, run the agent again, or check the logs to see if a command is stuck.`
            });
          }
          throw new Error("Session timeout reached");
        }

      // Measure and prune history to fit context window limit of MAX_CONTEXT_WINDOW_TOKENS
      const currentInputMessage = { role: "user", parts: [{ text: typeof message === "string" ? message : JSON.stringify(message) }] };
      let checkHistory = [...history];
      let totalTokens = 0;
      try {
        const checkRes = await genAI.models.countTokens({
          model: DEFAULT_MODEL_ID,
          contents: [...checkHistory, currentInputMessage],
        });
        totalTokens = checkRes.totalTokens || 0;
      } catch (e: any) {
        console.warn(`[CONTEXT MONITOR] Failed to count tokens:`, e.message);
      }

      if (totalTokens > MAX_CONTEXT_WINDOW_TOKENS) {
        console.log(`[CONTEXT MONITOR] Context window size (${totalTokens}) exceeds limit (${MAX_CONTEXT_WINDOW_TOKENS}). Pruning history...`);
        let pruneAttempts = 0;
        // Keep the first 4 messages (initialization) and the last 6 messages. Prune from the middle.
        while (checkHistory.length > 10 && totalTokens > MAX_CONTEXT_WINDOW_TOKENS && pruneAttempts < 100) {
          checkHistory.splice(4, 2);
          pruneAttempts++;
          try {
            const checkRes = await genAI.models.countTokens({
              model: DEFAULT_MODEL_ID,
              contents: [...checkHistory, currentInputMessage],
            });
            totalTokens = checkRes.totalTokens || 0;
          } catch (e) {
            break;
          }
        }
        console.log(`[CONTEXT MONITOR] Pruning complete. History reduced from ${history.length} to ${checkHistory.length} messages. New context window size: ${totalTokens} tokens.`);
        history.length = 0;
        history.push(...checkHistory);
      }

      let result: any;
      let retryCount429 = 0;
      let retryCount503 = 0;

      // Outer loop for API-level retries (429, 503)
      while (true) {
        try {
          result = await genAI.models.generateContent({
            model: DEFAULT_MODEL_ID,
            contents: [...history, currentInputMessage],
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
                  html: `The agent has been terminated because the Gemini API rate limit was consistently exceeded for <b><a href="https://github.com/${selected}">${selected}</a></b>.<br><br><b>What to Do Now / How to Solve This:</b> Wait a few minutes for the rate limits to clear, check your current API quota and usage in the Google AI Studio console, or switch to an API key with higher rate limits.`
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

          const handler = handlers[call.name];
          if (!handler) {
            toolResult = { status: "error", message: `Tool handler not found: ${call.name}` };
          } else {
            try {
              toolResult = await handler(call.args);
              if (toolResult.status === "error") throw new Error(toolResult.message);
              
              // Enhanced results logging
              if (call.name === "list_files" && toolResult.fileList) {
                getRepoStats(state.activeRepo);
                const files = toolResult.fileList.split("\n");
                const snippet = files.slice(0, 5).join(", ");
                console.log(`  - Found ${files.length} files. Snippet: [${snippet}${files.length > 5 ? ", ..." : ""}]`);
              }
              if (call.name === "list_issues" && call.args.owner && call.args.repo) {
                getRepoStats(`${call.args.owner}/${call.args.repo}`);
              }

              // Track successful creations
              if (call.name === "create_github_issue" && toolResult.url) {
                state.issuesCreated.push(toolResult.url);
                const repo = call.args.owner && call.args.repo ? `${call.args.owner}/${call.args.repo}` : state.activeRepo;
                getRepoStats(repo).issuesCreated.push(toolResult.url);
              }
              if (call.name === "create_pull_request" && toolResult.url) {
                state.prsCreated.push({ 
                  url: toolResult.url, 
                  issueNumber: call.args.issue_number,
                  issueUrl: call.args.issue_url
                });
              }
              if (call.name === "send_email" && toolResult.status === "success") {
                const subject = String(call.args.subject || "");
                const stats = getRepoStats(state.activeRepo);
                if (/architectural advisory|advisory/i.test(subject)) {
                  stats.advisoryEmailsSent++;
                } else {
                  stats.otherEmailsSent++;
                }
              }

              // Handle Hopping
              if (call.name === "hop_to_next_repo" && toolResult.action === "HOP_REQUESTED") {
                console.log(`[HOP] Moving to next repository: ${toolResult.next_repo}`);
                
                // 1. Cleanup current repo (disabled to preserve workspace/node_modules caching)
                
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
            } catch (e: any) {
              const messageText = e?.message || String(e);
              const inputError = isInputError(messageText);
              const diagnosis = inputError
                ? "This looks like an input or configuration problem. Correct the arguments, choose a different tool, report the limitation, or move to the next item."
                : "Decide whether this is transient, recoverable, blocked by environment/auth, or should be skipped with an explanatory email. Do not repeat the same tool call unchanged unless you have a specific reason.";

              state.errorsHandled.push(`[${call.name}] ${messageText}`);
              console.error(`Tool error (${call.name}): ${messageText}. Passing to AI for decision.`);
              toolResult = {
                status: "error",
                message: `Tool ${call.name} failed: ${messageText}`,
                failedTool: call.name,
                failedArgs: call.args,
                guidance: diagnosis
              };
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
      repositoriesProcessed: state.visitedRepos,
      repoBreakdown: [...state.repoStats.values()],
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
        html: `The agent session crashed on repository <b><a href="https://github.com/${selected}">${selected}</a></b>.<br><br><b>Reason:</b> ${error.message}<br><br><b>What to Do Now / How to Solve This:</b> Review the logs and failure reason. If the error is code-related, fix the bug. If it is a transient environment error, verify the setup and rerun the agent.`
      });
    }
    return {
      repo: selected,
      repositoriesProcessed: state.visitedRepos,
      repoBreakdown: [...state.repoStats.values()],
      issuesCreated: [],
      prsCreated: [],
      errors: [error.message],
      duration: Date.now() - sessionStartTime
    };
  } finally {
    terminateAllCommands();
    // Cleanup of workRoot is disabled to preserve workspace/node_modules caching

  }
}
