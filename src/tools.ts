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
        name: "analyze_codebase",
        description: "Reads source files from the cloned repository for analysis.",
        parameters: { type: Type.OBJECT, properties: {} }
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
        name: "apply_fix",
        description: "Applies a code fix to a specific file.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            file_path: { type: Type.STRING },
            content: { type: Type.STRING }
          },
          required: ["file_path", "content"]
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

  analyze_codebase: async () => {
    const ig = ignore();
    const gitignorePath = join(ctx.repoDir, ".gitignore");
    if (existsSync(gitignorePath)) ig.add(readFileSync(gitignorePath, "utf8"));
    const sourceFiles = getFilesRecursively(ctx.repoDir, ctx.repoDir, ig);
    let codebaseContext = "";
    for (const file of sourceFiles) {
      codebaseContext += `--- File: ${relative(ctx.repoDir, file)} ---\n${readFileSync(file, "utf8")}\n\n`;
    }
    return { status: "success", codebaseContext };
  },

  create_github_issue: async ({ owner, repo, title, body }: any) => {
    if (!ctx.octokit) return { status: "skipped", reason: "No GITHUB_TOKEN" };
    const res = await ctx.octokit.rest.issues.create({ owner, repo, title, body });
    return { status: "success", url: res.data.html_url, number: res.data.number };
  },

  apply_fix: async ({ file_path, content }: { file_path: string; content: string }) => {
    const fullPath = join(ctx.repoDir, file_path);
    if (!existsSync(fullPath)) return { status: "error", message: `File ${file_path} not found.` };
    writeFileSync(fullPath, content);
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
      finalBody += `\n\nCloses #${issue_number}`;
    }

    const res = await ctx.octokit.rest.pulls.create({ owner, repo, title, head: branch_name, base: "main", body: finalBody });
    return { status: "success", url: res.data.html_url };
  }
});
