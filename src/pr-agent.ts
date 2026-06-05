import { readFileSync } from "node:fs";
import { join } from "node:path";
import { genAI, octokit } from "./client.js";
import { runBugAgent } from "./ai.js";
import { GLOBAL_SESSION_RETRY_DELAY, DEFAULT_MODEL_ID } from "./constants.js";
import { flushEmails } from "./email-buffer.js";

const sessionStartTime = Date.now();

interface SessionSummary {
  repo: string;
  issuesCreated: string[];
  prsCreated: { url: string; issueNumber?: number; issueUrl?: string }[];
  errors: string[];
  duration: number;
}

async function sendFinalReport(mode: string, summaries: SessionSummary[]) {
  const totalPRs = summaries.reduce((acc, s) => acc + s.prsCreated.length, 0);
  const totalErrors = summaries.reduce((acc, s) => acc + s.errors.length, 0);
  
  const reportBody = summaries.map(s => `
<div style="background: #ffffff; padding: 15px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px;">
  <h3 style="margin-top: 0;">Repository: <a href="https://github.com/${s.repo}">${s.repo}</a></h3>
  <p><b>PRs Created:</b> ${s.prsCreated.length}</p>
  <ul style="list-style: none; padding-left: 10px;">
    ${s.prsCreated.map(pr => `<li>🛠️ <a href="${pr.url}">${pr.url}</a> ${pr.issueNumber ? `(Resolves Issue <a href="${pr.issueUrl || '#'}">#${pr.issueNumber}</a>)` : ""}</li>`).join("")}
  </ul>
  <p><b>Errors Handled:</b> ${s.errors.length}</p>
  <ul style="font-size: 0.9em; color: #666;">
    ${s.errors.length > 0 ? s.errors.map(e => `<li>${e}</li>`).join("") : "<li>None</li>"}
  </ul>
  <p style="font-size: 0.8em; color: #999;">Duration: ${(s.duration / 60000).toFixed(2)} minutes</p>
</div>
`).join("");

  const prompt = `Write a professional yet creative poem (8-12 lines) summarizing an autonomous agent's PR fix session.
Total Achievements: ${totalPRs} PRs created across ${summaries.length} repos.
Spirit: Resilience, precision, and continuous improvement.`;

  const result = await genAI.models.generateContent({
    model: DEFAULT_MODEL_ID,
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  });
  const poem = result.candidates?.[0]?.content?.parts?.[0]?.text || "The codebase is mended, the bugs are gone.";

  const { createHandlers } = await import("./tools.js");
  const handlers = createHandlers({} as any);
  
  const dateStr = new Date().toLocaleString();
  
  await handlers["send_email"]({
    subject: `[GRAND REPORT] PR Fix Session Achievement Summary - ${dateStr}`,
    html: `
<div style="font-family: sans-serif; color: #333; max-width: 800px; margin: 0 auto; line-height: 1.6;">
  <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">PR Fix Session Report</h1>
  <p>The autonomous agent has completed its scheduled fix cycle on ${dateStr}.</p>

  <div style="background: #eef7ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
    <h2 style="margin-top: 0; font-size: 1.2em; color: #2980b9;">Executive Summary</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td><b>Repositories Processed:</b></td><td style="text-align: right;">${summaries.length}</td></tr>
      <tr><td><b>Total PRs Created:</b></td><td style="text-align: right;">${totalPRs}</td></tr>
      <tr><td><b>Resilient Error Recoveries:</b></td><td style="text-align: right;">${totalErrors}</td></tr>
    </table>
  </div>

  <h2 style="color: #2c3e50; border-left: 4px solid #3498db; padding-left: 10px;">Repository Breakdown</h2>
  ${reportBody}

  <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0;">
  
  <div style="background: #fdfdfd; padding: 25px; border-radius: 8px; border: 1px dashed #ccc; font-style: italic; color: #555;">
    <p style="margin-top: 0; font-weight: bold; color: #777;">Fix Session Reflection:</p>
    ${poem.replace(/\n/g, "<br>")}
  </div>
</div>
`
  });
}

async function main() {
  const reposPath = join(process.cwd(), "repositories.json");
  const repos = JSON.parse(readFileSync(reposPath, "utf8")) as string[];
  const summaries: SessionSummary[] = [];

  console.log(`[PR STRATEGY] Surveying ${repos.length} repositories for high-impact issues...`);
  
  const { createHandlers } = await import("./tools.js");
  const handlers = createHandlers({ octokit } as any);
  
  const portfolioBacklog: any[] = [];
  for (const repoName of repos) {
    const [owner, repo] = repoName.split("/");
    if (!owner || !repo) continue;
    try {
      const res = await handlers["list_issues"]({ owner, repo });
      if (res.status === "success" && res.issues && res.issues.length > 0) {
        portfolioBacklog.push({ repo: repoName, issues: res.issues });
      }
    } catch (e) {
      console.error(`Failed to survey ${repoName}:`, e);
    }
  }

  if (portfolioBacklog.length === 0) {
    console.log("No open issues found across the portfolio. Finishing session.");
    await sendFinalReport("PR", []);
    return;
  }

  // AI Analyzes the backlogs and creates a prioritized Action Plan with Retries
  const strategyPrompt = `Analyze the following issue backlogs across multiple repositories. 
1. Categorize each issue as either "REAL_BUG" (needs a code fix) or "DUMMY" (placeholder, no-op, or unnecessary).
2. For any "DUMMY" issues, provide a brief reason why.
3. For any "DUMMY" issues, also provide a concrete "solve" recommendation under "whatToDoNow" (e.g. why it is low value, if it should be closed, or how it can be addressed/cleaned up).
4. Generate a prioritized list of repositories to process. Rank them by the total volume of high-impact "REAL_BUG" issues.

Important classification policy:
- Complex implementation work is NOT dummy work. Issues involving worker threads, background processes, IPC, multi-file refactors, validation failures, or architecture changes should remain "REAL_BUG" when they describe a real functional, performance, reliability, or security problem.
- Descriptive error logging context improvements (such as replacing \`console.error(error)\` with descriptive error messages like \`console.error("Failed to set side panel behavior:", error)\`), enhancing error messaging, and minor string or text configuration adjustments are NOT dummy, low-value, or placeholder work. They represent real diagnostics and code quality improvements and MUST be categorized as "REAL_BUG".
- Only classify an issue as "DUMMY" when it is genuinely placeholder, low-value, non-actionable, duplicate/no-op, or about safe sample data/environment defaults with no concrete runtime impact.
- If an issue is real but risky or may require manual product/architecture decisions, keep it in the real backlog. The PR Agent will later decide whether it can safely fix and validate it or should send a detailed manual-resolution email.

Backlogs:
${JSON.stringify(portfolioBacklog, null, 2)}

Return your analysis in the following JSON format:
{
  "prioritizedPlan": ["owner/repo", "owner/repo"],
  "dummyReports": [
    { "repo": "owner/repo", "issueNumber": 123, "url": "...", "reason": "...", "whatToDoNow": "..." }
  ]
}`;

  let strategyResult: any;
  let retryCount429 = 0;
  let retryCount503 = 0;

  while (true) {
    try {
      strategyResult = await genAI.models.generateContent({
        model: DEFAULT_MODEL_ID,
        contents: [{ role: "user", parts: [{ text: strategyPrompt }] }],
        config: { 
          responseMimeType: "application/json"
        }
      });
      break; // Success
    } catch (error: any) {
      const status = error?.status || 0;
      if (status === 429) {
        retryCount429++;
        const delay = retryCount429 === 1 ? 60000 : retryCount429 === 2 ? 240000 : 300000;
        if (retryCount429 > 3) throw error;
        console.log(`[429] Strategy Rate limited. Retrying in ${delay/1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else if (status === 503) {
        retryCount503++;
        if (retryCount503 > 9) throw error;
        const delay = retryCount503 <= 3 ? 2000 : 60000;
        console.log(`[503] Strategy Unavailable. Retry ${retryCount503}/9. Waiting ${delay/1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
  
  const analysis = JSON.parse(strategyResult.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
  
  // 1. Report Dummy Issues Immediately
  if (analysis.dummyReports && analysis.dummyReports.length > 0) {
    console.log(`[SAFEGUARD] Detected ${analysis.dummyReports.length} dummy issues. Reporting...`);
    for (const report of analysis.dummyReports) {
      await handlers["send_email"]({
        subject: `[DUMMY ISSUE DETECTED] ${report.repo} #${report.issueNumber}`,
        html: `The PR Agent has identified a low-value or dummy issue and will skip it.<br><br><b>Repo:</b> <a href="https://github.com/${report.repo}">${report.repo}</a><br><b>Issue:</b> <a href="${report.url}">#${report.issueNumber}</a><br><b>Reason:</b> ${report.reason}<br><br><b>What to Do Now / How to Solve This:</b> ${report.whatToDoNow || 'No recommendations provided.'}`
      });
    }
  }

  const plan = (analysis.prioritizedPlan as string[]) || [];
  if (plan.length === 0) {
    console.log("No high-impact real bugs found in the current portfolio survey. Finishing.");
    await sendFinalReport("PR", summaries);
    return;
  }

  console.log(`[PR STRATEGY] Action Plan created for ${plan.length} repositories.`);

  // 2. Iteratively process the plan
  let totalPRsCreated = 0;
  for (const targetRepo of plan) {
    if (totalPRsCreated >= 30) {
      console.log(`[CAP] Reached global session limit of 30 PRs. Stopping.`);
      break;
    }

    const validRepo = repos.find(r => r === targetRepo);
    if (!validRepo) continue;

    console.log(`\n--- AI Strategy: Prioritizing ${validRepo} for remediation ---`);
    try {
      const summary = await runBugAgent("PR", validRepo, sessionStartTime);
      summaries.push(summary);
      totalPRsCreated += summary.prsCreated.length;
    } catch (e) {
      console.log(`Session failed for ${validRepo}. Moving to next repository.`);
    }
  }

  await sendFinalReport("PR", summaries);
  await flushEmails("PR");
}

main().catch(async (error) => {
  console.error(error);
  try {
    await flushEmails("PR");
  } catch (e) {
    console.error("Failed to flush emails on crash:", e);
  }
});
