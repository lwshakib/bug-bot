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

export function isDependencyInstallCommand(command: string): boolean {
  return [
    /\b(?:npm|pnpm|yarn|bun)\s+(?:install|i|add|update|upgrade|ci)\b/i,
    /\b(?:pip|pip3)\s+install\b/i,
    /\bcomposer\s+(?:install|update|require)\b/i,
    /\bbundle\s+install\b/i,
    /\bgo\s+get\b/i,
    /\bcargo\s+(?:install|add|update)\b/i
  ].some(pattern => pattern.test(command));
}

export function isGlobalPackageInstallCommand(command: string): boolean {
  return [
    /\bnpm\s+(?:install|i)\b[^;&|]*(?:--global|-g)\b/i,
    /\bpnpm\s+(?:add|install)\b[^;&|]*(?:--global|-g)\b/i,
    /\byarn\s+global\s+add\b/i,
    /\bbun\s+add\s+(?:--global|-g)\b/i
  ].some(pattern => pattern.test(command));
}

export function isShellFileMutationCommand(command: string): boolean {
  return [
    /\bsed\s+[^;&|]*-[a-z]*i[a-z]*\b/i,
    /\bperl\s+[^;&|]*-[a-z]*i[a-z]*\b/i,
    /\bpython(?:3)?\s+-c\b/i,
    /\bnode\s+-e\b/i,
    />\s*[^&\s]/,
    />>\s*[^&\s]/
  ].some(pattern => pattern.test(command));
}

export function isBroadRecursiveSearchCommand(command: string): boolean {
  return [
    /\bgrep\b[^|;&]*(?:--recursive|-[a-zA-Z]*[rR])/,
    /\bfind\s+\.\/?\s(?!.*\b-maxdepth\b)/i
  ].some(pattern => pattern.test(command));
}

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function ensureValidPnpmWorkspace(repoDir: string) {
  if (!repoDir) return;
  const workspacePath = join(repoDir, "pnpm-workspace.yaml");
  if (existsSync(workspacePath)) {
    try {
      const content = readFileSync(workspacePath, "utf8");
      if (!/^\s*packages\s*:/mi.test(content)) {
        console.log(`[WORKSPACE FIX] pnpm-workspace.yaml is missing 'packages' field. Appending default packages list to prevent ERR_PNPM_IGNORED_BUILDS / workspace setup failures.`);
        const separator = content.endsWith("\n") ? "" : "\n";
        writeFileSync(workspacePath, content + separator + "packages:\n  - '.'\n");
      }
    } catch (e) {
      console.warn("[WORKSPACE FIX] Failed to inspect or write pnpm-workspace.yaml:", e);
    }
  }
}

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
