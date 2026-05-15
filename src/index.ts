import { readFileSync } from "node:fs";
import { join } from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runBugAgent } from "./ai.js";
import { GLOBAL_SESSION_RETRY_DELAY } from "./constants.js";

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option("mode", {
      type: "string",
      choices: ["ISSUE", "PR"],
      default: "ISSUE",
      description: "Agent execution mode"
    })
    .parse();

  const reposPath = join(process.cwd(), "repositories.json");
  const repos = JSON.parse(readFileSync(reposPath, "utf8")) as string[];

  if (argv.mode === "ISSUE") {
    // Issue Agent: Randomly select ONE repo and audit it.
    const selected = repos[Math.floor(Math.random() * repos.length)]!;
    console.log(`[AUDIT MODE] Targeting: ${selected}`);
    try {
      await runBugAgent("ISSUE", selected);
    } catch (e) {
      console.log(`Session failed. Waiting ${GLOBAL_SESSION_RETRY_DELAY/1000}s for a single retry...`);
      await new Promise(r => setTimeout(r, GLOBAL_SESSION_RETRY_DELAY));
      await runBugAgent("ISSUE", selected);
    }
  } else {
    // PR Agent: Iterate through ALL repos and solve issues.
    console.log(`[FIX MODE] Processing all ${repos.length} repositories...`);
    for (const repo of repos) {
      console.log(`\n--- Working on: ${repo} ---`);
      try {
        await runBugAgent("PR", repo);
      } catch (e) {
        console.log(`Session failed for ${repo}. Waiting ${GLOBAL_SESSION_RETRY_DELAY/1000}s for a single retry...`);
        await new Promise(r => setTimeout(r, GLOBAL_SESSION_RETRY_DELAY));
        await runBugAgent("PR", repo);
      }
    }
  }

  console.log("\nAgent session completed successfully.");
}

main().catch((error) => {
  console.error("Critical error in agent workflow:", error);
  process.exit(1);
});
