import type { ToolContext } from "../tools/utils.js";
import { cloneRepositoryTool } from "../tools/git/clone_repository.js";
import { listFilesTool } from "../tools/file/list_files.js";
import { readFileTool } from "../tools/file/read_file.js";
import { searchCodeTool } from "../tools/file/search_code.js";
import { extractCodeStructureTool } from "../tools/file/extract_code_structure.js";
import { semanticSearchCodeTool } from "../tools/file/semantic_search_code.js";
import { createGithubIssueTool } from "../tools/git/create_github_issue.js";
import { replaceLinesTool } from "../tools/file/replace_lines.js";
import { runCommandTool } from "../tools/os/run_command.js";
import { runValidationTool } from "../tools/os/run_validation.js";
import { listIssuesTool } from "../tools/git/list_issues.js";
import { createPullRequestTool } from "../tools/git/create_pull_request.js";
import { hopToNextRepoTool } from "../tools/general/hop_to_next_repo.js";
import { listPullRequestsTool } from "../tools/git/list_pull_requests.js";
import { sendEmailTool } from "../tools/general/send_email.js";
import { startBackgroundCommandTool } from "../tools/os/start_background_command.js";
import { checkCommandStatusTool } from "../tools/os/check_command_status.js";
import { terminateCommandTool } from "../tools/os/terminate_command.js";
import { waitForCommandTool } from "../tools/os/wait_for_command.js";

export { terminateAllCommands } from "../tools/utils.js";
export type { ToolContext } from "../tools/utils.js";

export const tools = [
  cloneRepositoryTool,
  listFilesTool,
  readFileTool,
  searchCodeTool,
  extractCodeStructureTool,
  semanticSearchCodeTool,
  createGithubIssueTool,
  replaceLinesTool,
  runCommandTool,
  runValidationTool,
  listIssuesTool,
  createPullRequestTool,
  hopToNextRepoTool,
  listPullRequestsTool,
  sendEmailTool,
  startBackgroundCommandTool,
  checkCommandStatusTool,
  terminateCommandTool,
  waitForCommandTool
];

export const toolDefinitions = [
  {
    functionDeclarations: tools.map(t => t.declaration)
  }
];

export const createHandlers = (ctx: ToolContext) => {
  const handlers: Record<string, (args: any) => Promise<any>> = {};
  for (const tool of tools) {
    handlers[tool.declaration.name] = (args: any) => tool.execute(args, ctx);
  }
  return handlers as {
    send_email: (args: { subject: string; html: string }) => Promise<any>;
    hop_to_next_repo: (args: any) => Promise<any>;
    list_issues: (args: { owner: string; repo: string }) => Promise<any>;
    list_pull_requests: (args: { owner: string; repo: string }) => Promise<any>;
    clone_repository: (args: { repo_name: string }) => Promise<any>;
    list_files: (args: any) => Promise<any>;
    read_file: (args: { file_path?: string; file_paths?: string[] }) => Promise<any>;
    search_code: (args: { query: string }) => Promise<any>;
    extract_code_structure: (args: { file_path: string }) => Promise<any>;
    semantic_search_code: (args: { query: string; limit?: number }) => Promise<any>;
    create_github_issue: (args: { owner: string; repo: string; title: string; body: string; labels?: string[] }) => Promise<any>;
    replace_lines: (args: { file_path: string; start_line: number; end_line: number; replacementContent: string }) => Promise<any>;
    run_command: (args: { command: string; is_validation?: boolean }) => Promise<any>;
    start_background_command: (args: { command: string; is_validation?: boolean }) => Promise<any>;
    check_command_status: (args: { command_id: string }) => Promise<any>;
    terminate_command: (args: { command_id: string }) => Promise<any>;
    wait_for_command: (args: { command_id: string; timeout_seconds: number }) => Promise<any>;
    run_validation: (args: { commands: string[] }) => Promise<any>;
    create_pull_request: (args: { owner: string; repo: string; branch_name: string; title: string; body: string; issue_number?: number; issue_url?: string }) => Promise<any>;
  };
};
