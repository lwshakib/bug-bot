import { readFileSync } from "node:fs";
import { join } from "node:path";
import { genAI } from "./utils/client.js";
import { runBugAgent } from "./llm/ai.js";
import { GLOBAL_SESSION_RETRY_DELAY, DEFAULT_MODEL_ID } from "./utils/constants.js";
import { flushEmails } from "./utils/email.js";

const sessionStartTime = Date.now();

interface RepoBreakdown {
  repo: string;
  issuesCreated: string[];
  advisoryEmailsSent: number;
  otherEmailsSent: number;
}

interface SessionSummary {
  repo: string;
  repositoriesProcessed?: string[];
  repoBreakdown?: RepoBreakdown[];
  issuesCreated: string[];
  prsCreated: { url: string; issueNumber?: number; issueUrl?: string }[];
  errors: string[];
  duration: number;
}

async function sendFinalReport(mode: string, summaries: SessionSummary[]) {
  const totalIssues = summaries.reduce((acc, s) => acc + s.issuesCreated.length, 0);
  const totalErrors = summaries.reduce((acc, s) => acc + s.errors.length, 0);
  const processedRepos = [...new Set(summaries.flatMap(s => s.repositoriesProcessed || [s.repo]))];
  const repoStats = new Map<string, RepoBreakdown>();

  for (const repo of processedRepos) {
    repoStats.set(repo, { repo, issuesCreated: [], advisoryEmailsSent: 0, otherEmailsSent: 0 });
  }

  for (const summary of summaries) {
    for (const stat of summary.repoBreakdown || []) {
      const existing = repoStats.get(stat.repo) || {
        repo: stat.repo,
        issuesCreated: [],
        advisoryEmailsSent: 0,
        otherEmailsSent: 0
      };
      existing.issuesCreated.push(...stat.issuesCreated);
      existing.advisoryEmailsSent += stat.advisoryEmailsSent;
      existing.otherEmailsSent += stat.otherEmailsSent;
      repoStats.set(stat.repo, existing);
    }
  }

  const totalAdvisories = [...repoStats.values()].reduce((acc, s) => acc + s.advisoryEmailsSent, 0);
  const totalOtherEmails = [...repoStats.values()].reduce((acc, s) => acc + s.otherEmailsSent, 0);
  const totalDuration = summaries.reduce((acc, s) => acc + s.duration, 0);

  const reportBody = [...repoStats.values()].map(s => `
<div style="background: #ffffff; padding: 15px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px;">
  <h3 style="margin-top: 0;">Repository: <a href="https://github.com/${s.repo}">${s.repo}</a></h3>
  <p><b>Issues Created:</b> ${s.issuesCreated.length}</p>
  <ul style="list-style: none; padding-left: 10px;">
    ${s.issuesCreated.length > 0 ? s.issuesCreated.map(url => `<li>Issue: <a href="${url}">${url}</a></li>`).join("") : "<li>No safe issue-worthy bugs created in this repo.</li>"}
  </ul>
  <p><b>Architectural/Risky Advisory Emails Sent:</b> ${s.advisoryEmailsSent}</p>
  <p><b>Other Audit Emails Sent:</b> ${s.otherEmailsSent}</p>
</div>
`).join("");

  const prompt = `Write a professional yet creative poem (8-12 lines) summarizing an autonomous agent's audit session.
Total Achievements: ${totalIssues} issues created across ${processedRepos.length} processed repos, with ${totalAdvisories} advisory emails for risky architectural findings.
Spirit: Vigilance, precision, and continuous improvement.`;

  const result = await genAI.models.generateContent({
    model: DEFAULT_MODEL_ID,
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  });
  const poem = result.candidates?.[0]?.content?.parts?.[0]?.text || "The audit is done, the path is clear.";

  const { createHandlers } = await import("./utils/tools.js");
  const handlers = createHandlers({} as any);

  const dateStr = new Date().toLocaleString();

  await handlers["send_email"]({
    subject: `[GRAND REPORT] ISSUE Audit Session Achievement Summary - ${dateStr}`,
    html: `
<div style="font-family: sans-serif; color: #333; max-width: 800px; margin: 0 auto; line-height: 1.6;">
  <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">ISSUE Audit Session Report</h1>
  <p>The autonomous agent has successfully completed its audit cycle on ${dateStr}.</p>

  <div style="background: #eef7ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
    <h2 style="margin-top: 0; font-size: 1.2em; color: #2980b9;">Executive Summary</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td><b>Issue Target:</b></td><td style="text-align: right;">20-30 excellent bugs across the whole run, not per repo</td></tr>
      <tr><td><b>Repositories Processed:</b></td><td style="text-align: right;">${processedRepos.length}</td></tr>
      <tr><td><b>Total Safe Issues Created:</b></td><td style="text-align: right;">${totalIssues}</td></tr>
      <tr><td><b>Architectural/Risky Advisories Emailed:</b></td><td style="text-align: right;">${totalAdvisories}</td></tr>
      <tr><td><b>Other Audit Emails:</b></td><td style="text-align: right;">${totalOtherEmails}</td></tr>
      <tr><td><b>Resilient Error Recoveries:</b></td><td style="text-align: right;">${totalErrors}</td></tr>
      <tr><td><b>Total Duration:</b></td><td style="text-align: right;">${(totalDuration / 60000).toFixed(2)} minutes</td></tr>
    </table>
  </div>

  <h2 style="color: #2c3e50; border-left: 4px solid #3498db; padding-left: 10px;">Repository Breakdown</h2>
  ${reportBody}

  <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0;">

  <div style="background: #fdfdfd; padding: 25px; border-radius: 8px; border: 1px dashed #ccc; font-style: italic; color: #555;">
    <p style="margin-top: 0; font-weight: bold; color: #777;">Audit Reflection:</p>
    ${poem.replace(/\n/g, "<br>")}
  </div>
</div>
`
  });
}

async function main() {
  const reposPath = join(process.cwd(), "repositories.json");
  const repos = JSON.parse(readFileSync(reposPath, "utf8")) as string[];
  const selected = repos[Math.floor(Math.random() * repos.length)]!;
  const summaries: SessionSummary[] = [];

  console.log(`[AUDIT MODE] Targeting: ${selected}`);
  try {
    const summary = await runBugAgent("ISSUE", selected, sessionStartTime);
    summaries.push(summary);
  } catch (e) {
    console.log(`Session failed. Waiting ${GLOBAL_SESSION_RETRY_DELAY / 1000}s for a single retry...`);
    await new Promise(r => setTimeout(r, GLOBAL_SESSION_RETRY_DELAY));
    const summary = await runBugAgent("ISSUE", selected, sessionStartTime);
    summaries.push(summary);
  }

  await sendFinalReport("ISSUE", summaries);
  await flushEmails("ISSUE");
}

main().catch(async (error) => {
  console.error(error);
  try {
    await flushEmails("ISSUE");
  } catch (e) {
    console.error("Failed to flush emails on crash:", e);
  }
});
