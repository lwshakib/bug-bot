import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { Type } from "@google/genai";
import { Octokit } from "octokit";
import ignore from "ignore";

export interface ToolContext {
  githubToken?: string | undefined;
  octokit: Octokit | null;
  workRoot: string;
  repoDir: string;
  setRepoDir: (dir: string) => void;
  setWorkRoot: (dir: string) => void;
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
    if (statSync(fullPath).isDirectory()) {
      files.push(...getFilesRecursively(fullPath, baseDir, ig));
    } else if (/\.(ts|js|tsx|jsx|py|go|java|c|cpp|h|cs|php|rb|rs)$/.test(entry)) {
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
            body: { type: Type.STRING }
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
        name: "run_validation",
        description: "Installs dependencies and runs validation scripts (build, lint, test).",
        parameters: { type: Type.OBJECT, properties: {} }
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
            issue_number: { type: Type.NUMBER, description: "Optional issue number to link and close (e.g. 123)." }
          },
          required: ["owner", "repo", "branch_name", "title", "body"]
        }
      }
    ]
  }
];

export const createHandlers = (ctx: ToolContext) => ({
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

  create_github_issue: async ({ owner, repo, title, body }: any) => {
    if (!ctx.octokit) return { status: "skipped", reason: "No GITHUB_TOKEN" };
    const res = await ctx.octokit.rest.issues.create({ owner, repo, title, body });
    return { status: "success", url: res.data.html_url, number: res.data.number };
  },

  replace_lines: async ({ file_path, start_line, end_line, replacementContent }: { file_path: string; start_line: number; end_line: number; replacementContent: string }) => {
    const fullPath = join(ctx.repoDir, file_path);
    if (!existsSync(fullPath)) return { status: "error", message: `File ${file_path} not found.` };
    const content = readFileSync(fullPath, "utf8");
    const lines = content.split("\n");
    
    if (start_line < 1 || end_line > lines.length || start_line > end_line) {
      return { status: "error", message: `Invalid line range: ${start_line}-${end_line}. File has ${lines.length} lines.` };
    }

    const before = lines.slice(0, start_line - 1);
    const after = lines.slice(end_line);
    const newContent = [...before, replacementContent, ...after].join("\n");
    
    writeFileSync(fullPath, newContent);
    return { status: "success" };
  },

  run_validation: async () => {
    const pkgPath = join(ctx.repoDir, "package.json");
    if (!existsSync(pkgPath)) return { status: "success", message: "No package.json found." };
    const hasLock = existsSync(join(ctx.repoDir, "package-lock.json"));
    run(hasLock ? "npm ci" : "npm install", ctx.repoDir);
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const toRun = ["format", "format:check", "type-check", "build", "lint", "test-once", "test"].filter(s => pkg.scripts?.[s]);
    for (const script of toRun) run(`npm run ${script}`, ctx.repoDir);
    return { status: "success", scripts_run: toRun };
  },

  create_pull_request: async ({ owner, repo, branch_name, title, body, issue_number }: any) => {
    if (!ctx.octokit) return { status: "skipped", reason: "No GITHUB_TOKEN" };
    run(`git checkout -b ${branch_name}`, ctx.repoDir);
    run(`git config user.email "leadwithshakib@gmail.com"`, ctx.repoDir);
    run(`git config user.name "Shakib Khan"`, ctx.repoDir);
    run(`git add .`, ctx.repoDir);
    run(`git commit -m "${title}"`, ctx.repoDir);
    run(`git push origin ${branch_name}`, ctx.repoDir);
    
    let finalBody = body;
    if (issue_number) {
      const closingPhrase = `Closes #${issue_number}`;
      if (!finalBody.includes(closingPhrase)) {
        finalBody += `\n\n${closingPhrase}`;
      }
    }

    const res = await ctx.octokit.rest.pulls.create({ owner, repo, title, head: branch_name, base: "main", body: finalBody });
    return { status: "success", url: res.data.html_url };
  }
});
