import { readFileSync } from "node:fs";
import { join } from "node:path";
import { genAI } from "./client.js";
import { runBugAgent } from "./ai.js";
import { GLOBAL_SESSION_RETRY_DELAY, DEFAULT_MODEL_ID } from "./constants.js";

const sessionStartTime = Date.now();

interface SessionSummary {
  repo: string;
  issuesCreated: string[];
  prsCreated: { url: string; issueNumber?: number; issueUrl?: string }[];
  errors: string[];
  duration: number;
}

async function sendFinalReport(mode: string, summaries: SessionSummary[]) {
  const totalIssues = summaries.reduce((acc, s) => acc + s.issuesCreated.length, 0);
  const totalPRs = summaries.reduce((acc, s) => acc + s.prsCreated.length, 0);
  const totalErrors = summaries.reduce((acc, s) => acc + s.errors.length, 0);
  
  const reportBody = summaries.map(s => `
<div style="background: #ffffff; padding: 15px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px;">
  <h3 style="margin-top: 0;">Repository: ${s.repo}</h3>
  <p><b>Issues Found:</b> ${s.issuesCreated.length}</p>
  <ul style="list-style: none; padding-left: 10px;">
    ${s.issuesCreated.map(url => `<li>🔗 <a href="${url}">${url}</a></li>`).join("")}
  </ul>
  <p style="font-size: 0.9em; color: #666;">Duration: ${(s.duration / 60000).toFixed(2)} minutes</p>
</div>
`).join("");

  const prompt = `Write a professional yet creative poem (8-12 lines) summarizing an autonomous agent's audit session.
Total Achievements: ${totalIssues} issues found across ${summaries.length} repos.
Spirit: Vigilance, precision, and continuous improvement.`;

  const result = await genAI.models.generateContent({
    model: DEFAULT_MODEL_ID,
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  });
  const poem = result.candidates?.[0]?.content?.parts?.[0]?.text || "The audit is done, the path is clear.";

  const { createHandlers } = await import("./tools.js");
  const handlers = createHandlers({} as any);
  
  await handlers["send_email"]({
    subject: `[GRAND REPORT] ISSUE Audit Session Achievement Summary`,
    html: `
<div style="font-family: sans-serif; color: #333; max-width: 800px; margin: 0 auto; line-height: 1.6;">
  <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">ISSUE Audit Session Report</h1>
  <p>The autonomous agent has successfully completed its audit cycle.</p>

  <div style="background: #eef7ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
    <h2 style="margin-top: 0; font-size: 1.2em; color: #2980b9;">Executive Summary</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td><b>Repositories Audited:</b></td><td style="text-align: right;">${summaries.length}</td></tr>
      <tr><td><b>Total Issues Identified:</b></td><td style="text-align: right;">${totalIssues}</td></tr>
      <tr><td><b>Resilient Error Recoveries:</b></td><td style="text-align: right;">${totalErrors}</td></tr>
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
    console.log(`Session failed. Waiting ${GLOBAL_SESSION_RETRY_DELAY/1000}s for a single retry...`);
    await new Promise(r => setTimeout(r, GLOBAL_SESSION_RETRY_DELAY));
    const summary = await runBugAgent("ISSUE", selected, sessionStartTime);
    summaries.push(summary);
  }

  await sendFinalReport("ISSUE", summaries);
}

main().catch(console.error);
