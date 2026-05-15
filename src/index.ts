import { runBugAgent } from "./ai.js";

runBugAgent().catch((error) => {
  console.error("Critical error in agent execution:", error);
  process.exit(1);
});
