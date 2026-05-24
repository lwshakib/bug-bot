import { execSync, ChildProcess } from "node:child_process";
import { Octokit } from "octokit";

export interface ToolContext {
  githubToken?: string | undefined;
  octokit: Octokit | null;
  workRoot: string;
  repoDir: string;
  visitedRepos: string[];
  hasUnvalidatedChanges: boolean;
  validationFailures: string[];
  validationPasses: string[];
  setRepoDir: (dir: string) => void;
  setWorkRoot: (dir: string) => void;
  addVisitedRepo: (repo: string) => void;
  markFilesChanged: () => void;
  recordValidationResult: (command: string, exitCode: number | null) => void;
  terminateAllCommands: () => void;
}

export interface CommandSession {
  process: ChildProcess;
  command: string;
  isValidation: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  startTime: number;
}

export const activeCommands = new Map<string, CommandSession>();

export const terminateAllCommands = () => {
  console.log(`[CLEANUP] Terminating ${activeCommands.size} active background commands...`);
  for (const [id, session] of activeCommands.entries()) {
    if (session.exitCode === null) {
      try {
        if (process.platform === "win32" && session.process.pid !== undefined) {
          try {
            execSync(`taskkill /pid ${session.process.pid} /T /F`, { stdio: "ignore" });
            console.log(`  - Killed command tree: ${id} (PID ${session.process.pid})`);
          } catch (err) {
            session.process.kill();
          }
        } else {
          session.process.kill();
          console.log(`  - Killed command: ${id}`);
        }
      } catch (e) {
        console.error(`  - Failed to kill command ${id}:`, e);
      }
    }
  }
  activeCommands.clear();
};

export function run(command: string, cwd: string): string {
  return execSync(command, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
}

export interface Tool<TArgs = any> {
  declaration: {
    name: string;
    description: string;
    parameters?: any;
  };
  execute: (args: TArgs, ctx: ToolContext) => Promise<any>;
}

export function defineTool<TArgs = any>(tool: Tool<TArgs>): Tool<TArgs> {
  return tool;
}
