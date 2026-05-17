import { execSync, spawn, ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { Type } from "@google/genai";
import { Octokit } from "octokit";
import ignore from "ignore";

interface CommandSession {
  process: ChildProcess;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  startTime: number;
}

const activeCommands = new Map<string, CommandSession>();

export interface ToolContext {
  githubToken?: string | undefined;
  octokit: Octokit | null;
  workRoot: string;
  repoDir: string;
  visitedRepos: string[];
  setRepoDir: (dir: string) => void;
  setWorkRoot: (dir: string) => void;
  addVisitedRepo: (repo: string) => void;
  terminateAllCommands: () => void;
}

function run(command: string, cwd: string): string {
  return execSync(command, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
}

function getFilesRecursively(dir: string, baseDir: string, ig: any): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = relative(baseDir, fullPath);
    if (entry === "node_modules" || entry === ".git" || ig.ignores(relPath)) continue;

    const stats = statSync(fullPath);
    if (stats.isSymbolicLink()) continue;

    if (stats.isDirectory()) {
      files.push(...getFilesRecursively(fullPath, baseDir, ig));
    } else if (/\.(ts|js|tsx|jsx|py|go|java|c|cpp|h|cs|php|rb|rs|json|yaml|yml|toml|lock)$/i.test(entry) || /^(Makefile|Dockerfile)$/i.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

export const toolDefinitions = [
  {
    functionDeclarations: [
      {
        name: "clone_repository",
        description: "Clones a GitHub repository into a temporary directory.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            repo_name: { type: Type.STRING, description: "The owner/repo name or full URL." }
          },
          required: ["repo_name"]
        }
      },
      {
        name: "list_files",
        description: "Lists all source files in the repository to understand the project structure.",
        parameters: { type: Type.OBJECT, properties: {} }
      },
      {
        name: "read_file",
        description: "Reads the content of a specific file with line numbers.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            file_path: { type: Type.STRING }
          },
          required: ["file_path"]
        }
      },
      {
        name: "search_code",
        description: "Searches for a specific string or pattern across all source files (grep).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "The string or regex to search for." }
          },
          required: ["query"]
        }
      },
      {
        name: "create_github_issue",
        description: "Creates an issue on the target repository.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            owner: { type: Type.STRING },
            repo: { type: Type.STRING },
            title: { type: Type.STRING },
            body: { type: Type.STRING },
            labels: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optional labels (e.g. ['bug', 'high-priority'])." }
          },
          required: ["owner", "repo", "title", "body"]
        }
      },
      {
        name: "replace_lines",
        description: "Replaces a specific range of lines in a file with new code.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            file_path: { type: Type.STRING },
            start_line: { type: Type.NUMBER, description: "The starting line number (1-indexed)." },
            end_line: { type: Type.NUMBER, description: "The ending line number (inclusive, 1-indexed)." },
            replacementContent: { type: Type.STRING, description: "The new code to insert." }
          },
          required: ["file_path", "start_line", "end_line", "replacementContent"]
        }
      },
      {
        name: "run_command",
        description: "Executes an arbitrary shell command in the repository directory. Use this for installing packages, running custom tests, or project-specific CLI tools.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            command: { type: Type.STRING, description: "The shell command to execute." }
          },
          required: ["command"]
        }
      },
      {
        name: "run_validation",
        description: "Executes validation commands to ensure the fix is correct. You MUST inspect the repository (package manager, Makefile, CI scripts) to determine the exact commands to run (e.g., 'pnpm run build', 'pytest', etc.).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            commands: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }, 
              description: "List of specific validation commands to run." 
            }
          },
          required: ["commands"]
        }
      },
      {
        name: "list_issues",
        description: "Lists all open issues in the repository.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            owner: { type: Type.STRING },
            repo: { type: Type.STRING }
          },
          required: ["owner", "repo"]
        }
      },
      {
        name: "create_pull_request",
        description: "Commits changes and creates a Pull Request.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            owner: { type: Type.STRING },
            repo: { type: Type.STRING },
            branch_name: { type: Type.STRING },
            title: { type: Type.STRING },
            body: { type: Type.STRING },
            issue_number: { type: Type.NUMBER, description: "Optional issue number to link and close (e.g. 123)." },
            issue_url: { type: Type.STRING, description: "Optional URL of the issue being resolved." }
          },
          required: ["owner", "repo", "branch_name", "title", "body"]
        }
      },
      {
        name: "hop_to_next_repo",
        description: "Switches the current focus to another repository from the list that has not yet been processed in this session.",
        parameters: { type: Type.OBJECT, properties: {} }
      },
      {
        name: "list_pull_requests",
        description: "Lists all open Pull Requests in the repository.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            owner: { type: Type.STRING },
            repo: { type: Type.STRING }
          },
          required: ["owner", "repo"]
        }
      },
      {
        name: "send_email",
        description: "Sends an email notification using Resend.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            html: { type: Type.STRING }
          },
          required: ["subject", "html"]
        }
      },
      {
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
      {
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
      {
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
      {
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
      }
    ]
  }
];

import { resend, octokit, genAI } from "./client.js";
import { NOTIFICATION_EMAIL } from "./constants.js";

export const terminateAllCommands = () => {
  console.log(`[CLEANUP] Terminating ${activeCommands.size} active background commands...`);
  for (const [id, session] of activeCommands.entries()) {
    if (session.exitCode === null) {
      try {
        session.process.kill();
        console.log(`  - Killed command: ${id}`);
      } catch (e) {
        console.error(`  - Failed to kill command ${id}:`, e);
      }
    }
  }
  activeCommands.clear();
};

export const createHandlers = (ctx: ToolContext) => ({
  send_email: async ({ subject, html }: { subject: string; html: string }) => {
    if (!resend || !NOTIFICATION_EMAIL) return { status: "skipped", reason: "Resend not configured" };
    try {
      const { data, error } = await resend.emails.send({
        from: "Repository Maintainer Bot <bot@lwshakib.site>",
        to: [NOTIFICATION_EMAIL],
        subject,
        html,
      });
      if (error) return { status: "error", message: error.message };
      return { status: "success", id: data?.id };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  },

  hop_to_next_repo: async () => {
    const reposPath = join(process.cwd(), "repositories.json");
    if (!existsSync(reposPath)) return { status: "error", message: "repositories.json not found" };
    
    const repos = JSON.parse(readFileSync(reposPath, "utf8")) as string[];
    const available = repos.filter(r => !ctx.visitedRepos.includes(r));
    
    if (available.length === 0) {
      return { status: "success", action: "FINISH", message: "All repositories in the portfolio have been processed." };
    }

    // Pick a new random repo from available
    const next = available[Math.floor(Math.random() * available.length)]!;
    return { status: "success", action: "HOP_REQUESTED", next_repo: next };
  },

  list_issues: async ({ owner, repo }: { owner: string; repo: string }) => {
    if (!ctx.octokit) return { status: "skipped", reason: "No GITHUB_TOKEN" };
    const res = await ctx.octokit.rest.issues.listForRepo({ owner, repo, state: "open" });
    const issues = res.data.map(i => ({ number: i.number, title: i.title, body: i.body, url: i.html_url }));
    return { status: "success", issues };
  },

  list_pull_requests: async ({ owner, repo }: { owner: string; repo: string }) => {
    if (!ctx.octokit) return { status: "skipped", reason: "No GITHUB_TOKEN" };
    const res = await ctx.octokit.rest.pulls.list({ owner, repo, state: "open" });
    const prs = res.data.map(p => ({ number: p.number, title: p.title, head: p.head.ref }));
    return { status: "success", prs };
  },
  clone_repository: async ({ repo_name }: { repo_name: string }) => {
    const workRoot = mkdtempSync(join(tmpdir(), "repo-agent-"));
    const repoDir = join(workRoot, "repo");
    ctx.setWorkRoot(workRoot);
    ctx.setRepoDir(repoDir);

    let url = repo_name.includes("://") ? repo_name : `https://github.com/${repo_name}.git`;
    if (ctx.githubToken && url.startsWith("https://github.com/")) {
      url = url.replace("https://github.com/", `https://x-access-token:${ctx.githubToken}@github.com/`);
    }
    run(`git clone --depth 1 "${url}" "${repoDir}"`, process.cwd());
    return { status: "success", repoDir };
  },

  list_files: async () => {
    const ig = ignore();
    const gitignorePath = join(ctx.repoDir, ".gitignore");
    if (existsSync(gitignorePath)) ig.add(readFileSync(gitignorePath, "utf8"));
    const sourceFiles = getFilesRecursively(ctx.repoDir, ctx.repoDir, ig);
    const fileList = sourceFiles.map(f => relative(ctx.repoDir, f)).join("\n");
    return { status: "success", fileList };
  },

  read_file: async ({ file_path }: { file_path: string }) => {
    const fullPath = join(ctx.repoDir, file_path);
    if (!existsSync(fullPath)) return { status: "error", message: `File ${file_path} not found.` };
    const content = readFileSync(fullPath, "utf8");
    const lines = content.split("\n");
    const numberedContent = lines.map((line, idx) => `${idx + 1}: ${line}`).join("\n");
    return { status: "success", content: numberedContent };
  },

  search_code: async ({ query }: { query: string }) => {
    try {
      // Use git grep if it's a git repo, otherwise use a simple search (not implemented here for brevity, assuming git)
      const results = run(`git grep -nI "${query}"`, ctx.repoDir);
      return { status: "success", results };
    } catch (e) {
      return { status: "success", message: "No matches found." };
    }
  },

  create_github_issue: async ({ owner, repo, title, body, labels }: any) => {
    if (!ctx.octokit) return { status: "skipped", reason: "No GITHUB_TOKEN" };
    const res = await ctx.octokit.rest.issues.create({ owner, repo, title, body, labels });
    return { status: "success", url: res.data.html_url, number: res.data.number };
  },

  replace_lines: async ({ file_path, start_line, end_line, replacementContent }: { file_path: string; start_line: number; end_line: number; replacementContent: string }) => {
    const fullPath = join(ctx.repoDir, file_path);
    if (!existsSync(fullPath)) return { status: "error", message: `File ${file_path} not found.` };
    const content = readFileSync(fullPath, "utf8");
    const lines = content.split("\n");
    
    // Safety: Auto-correct swapped line numbers
    let start = start_line;
    let end = end_line;
    if (start > end) {
      console.log(`[SAFETY] Swapping invalid range: ${start}-${end} to ${end}-${start}`);
      [start, end] = [end, start];
    }

    if (start < 1 || end > lines.length || start > end) {
      return { status: "error", message: `Invalid line range: ${start}-${end}. File has ${lines.length} lines.` };
    }

    const before = lines.slice(0, start - 1);
    const after = lines.slice(end);
    const newContent = [...before, replacementContent, ...after].join("\n");
    
    writeFileSync(fullPath, newContent);
    return { status: "success" };
  },

  run_command: async ({ command }: { command: string }) => {
    if (!ctx.repoDir) return { status: "skipped", reason: "No repository cloned" };
    try {
      console.log(`Running CLI command: ${command}`);
      const output = execSync(command, { cwd: ctx.repoDir, stdio: "pipe", encoding: "utf8", timeout: 300000 });
      return { status: "success", output };
    } catch (e: any) {
      if (e.code === 'ETIMEDOUT') return { status: "failure", error: "Command timed out after 5 minutes. For long-running tasks, use start_background_command." };
      return { status: "failure", error: e.message, stdout: e.stdout, stderr: e.stderr };
    }
  },

  start_background_command: async ({ command }: { command: string }) => {
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
    
    activeCommands.set(commandId, session);
    return { status: "success", command_id: commandId, message: "Command started in background. Use check_command_status to monitor." };
  },

  check_command_status: async ({ command_id }: { command_id: string }) => {
    const session = activeCommands.get(command_id);
    if (!session) return { status: "error", message: `Command ID ${command_id} not found.` };
    
    return {
      status: "success",
      isRunning: session.exitCode === null,
      exitCode: session.exitCode,
      stdout: session.stdout,
      stderr: session.stderr,
      durationSeconds: Math.floor((Date.now() - session.startTime) / 1000)
    };
  },

  terminate_command: async ({ command_id }: { command_id: string }) => {
    const session = activeCommands.get(command_id);
    if (!session) return { status: "error", message: `Command ID ${command_id} not found.` };
    
    if (session.exitCode === null) {
      session.process.kill();
      return { status: "success", message: "Command terminated." };
    } else {
      return { status: "skipped", message: "Command already finished." };
    }
  },
  wait_for_command: async ({ command_id, timeout_seconds }: { command_id: string; timeout_seconds: number }) => {
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
  },

  run_validation: async ({ commands }: { commands: string[] }) => {
    if (!ctx.repoDir) return { status: "skipped", reason: "No repository cloned" };
    if (!commands || commands.length === 0) return { status: "error", message: "You must provide specific validation commands." };
    
    const results: any[] = [];
    try {

      console.log(`Executing validation: ${commands.join(", ")}`);

      for (const cmd of commands) {
        try {
          const output = execSync(cmd, { cwd: ctx.repoDir, stdio: "pipe", encoding: "utf8", timeout: 300000 });
          results.push({ command: cmd, status: "passed", output });
        } catch (e: any) {
          if (e.code === 'ETIMEDOUT') {
            results.push({ command: cmd, status: "failed", error: "Command timed out after 5 minutes." });
          } else {
            results.push({ command: cmd, status: "failed", error: e.message, stdout: e.stdout, stderr: e.stderr });
          }
        }
      }

      const allPassed = results.every(r => r.status !== "failed");
      return { 
        status: allPassed ? "success" : "failure", 
        message: allPassed ? "All validation checks passed." : "CRITICAL: ONE OR MORE VALIDATION CHECKS FAILED. YOU MUST FIX THESE ERRORS BEFORE CREATING A PULL REQUEST.",
        checks: results 
      };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  },

  create_pull_request: async ({ owner, repo, branch_name, title, body, issue_number }: any) => {
    if (!ctx.octokit) return { status: "skipped", reason: "No GITHUB_TOKEN" };
    // Use -B to create or reset the branch if it already exists locally
    run(`git checkout -B ${branch_name}`, ctx.repoDir);
    run(`git config user.email "leadwithshakib@gmail.com"`, ctx.repoDir);
    run(`git config user.name "Shakib Khan"`, ctx.repoDir);
    run(`git add .`, ctx.repoDir);
    try {
      run(`git commit -m "${title}"`, ctx.repoDir);
    } catch (e) {
      console.log("Nothing to commit, continuing...");
    }
    // Use --force to ensure the push succeeds even if the remote branch exists (useful for retries)
    run(`git push origin ${branch_name} --force`, ctx.repoDir);
    
    let finalBody = body;
    if (issue_number) {
      const closingPhrase = `Closes #${issue_number}`;
      if (!finalBody.includes(closingPhrase)) {
        finalBody += `\n\n${closingPhrase}`;
      }
    }

    let baseBranch = "main";
    try {
      // Check if master exists and main does not
      execSync(`git show-ref --verify --quiet refs/remotes/origin/master`, { cwd: ctx.repoDir });
      try {
        execSync(`git show-ref --verify --quiet refs/remotes/origin/main`, { cwd: ctx.repoDir });
      } catch {
        baseBranch = "master";
      }
    } catch {}

    try {
      const res = await ctx.octokit.rest.pulls.create({ owner, repo, title, head: branch_name, base: baseBranch, body: finalBody });
      
      // Cleanup: Attempt to return to the base branch after successful PR to avoid leaking changes into next task
      try {
        run(`git checkout ${baseBranch}`, ctx.repoDir);
        run(`git reset --hard origin/${baseBranch}`, ctx.repoDir);
      } catch (e) {
        console.log("Cleanup failed, but PR was created.");
      }

      return { status: "success", url: res.data.html_url };
    } catch (e: any) {
      if (e.message.includes("A pull request already exists")) {
        const pulls = await ctx.octokit.rest.pulls.list({ owner, repo, head: `${owner}:${branch_name}`, state: "open" });
        if (pulls.data.length > 0) {
          const pr = pulls.data[0]!;
          return { status: "success", url: pr.html_url, message: "Pull request already exists." };
        }
      }
      throw e;
    }
  }
});
