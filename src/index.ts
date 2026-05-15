import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runBugAgent } from "./ai.js";

async function main() {
  const reposPath = join(process.cwd(), "repositories.json");
  const repos = JSON.parse(readFileSync(reposPath, "utf8")) as string[];
  const selected = repos[Math.floor(Math.random() * repos.length)]!;

  console.log(`Starting Sequential Agent Workflow for: ${selected}`);

  try {
    // 1. Run Issue Agent
    await runBugAgent("ISSUE", selected);
    
    // 2. Run PR Agent
    await runBugAgent("PR", selected);
    
    console.log("\nWorkflow completed successfully.");
  } catch (error) {
    console.error("Critical error in agent workflow:", error);
    process.exit(1);
  }
}

main();
