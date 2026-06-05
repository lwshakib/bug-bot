import { resend } from "./client.js";
import { NOTIFICATION_EMAIL } from "./constants.js";

interface BufferedEmail {
  subject: string;
  html: string;
}

const buffer: BufferedEmail[] = [];

/**
 * Queue an email notification in memory.
 */
export function queueEmail(subject: string, html: string) {
  console.log(`[EMAIL QUEUED] Subject: ${subject}`);
  buffer.push({ subject, html });
}

/**
 * Flushes all buffered emails into a single consolidated email.
 */
export async function flushEmails(agentType: "ISSUE" | "PR" | "TERMINATED") {
  if (buffer.length === 0) {
    console.log("[EMAIL FLUSH] No emails to send.");
    return { status: "skipped", reason: "Buffer is empty" };
  }

  console.log(`[EMAIL FLUSH] Flushing ${buffer.length} emails into a single consolidated email for agent type: ${agentType}...`);

  // Try to find the Grand Report email to use as the primary body.
  const grandReportIndex = buffer.findIndex(e => e.subject.includes("[GRAND REPORT]"));
  
  let primaryEmail: BufferedEmail;
  let otherEmails: BufferedEmail[] = [];
  
  if (grandReportIndex !== -1) {
    primaryEmail = buffer[grandReportIndex]!;
    otherEmails = buffer.filter((_, idx) => idx !== grandReportIndex);
  } else {
    // If no grand report exists, treat the first email as primary.
    primaryEmail = buffer[0]!;
    otherEmails = buffer.slice(1);
  }

  let combinedHtml = primaryEmail.html;
  
  if (otherEmails.length > 0) {
    combinedHtml += `
<br><hr style="border: 0; border-top: 2px dashed #999; margin: 40px 0;"><br>
<h2 style="color: #2c3e50; font-family: sans-serif;">Additional Session Alerts & Notifications</h2>
`;
    for (const email of otherEmails) {
      combinedHtml += `
<div style="background: #fff8f8; border: 1px solid #f5c6cb; border-radius: 8px; padding: 15px; margin-bottom: 20px; font-family: sans-serif;">
  <h3 style="margin-top: 0; color: #721c24; border-bottom: 1px solid #f5c6cb; padding-bottom: 5px;">Subject: ${email.subject}</h3>
  <div>${email.html}</div>
</div>
`;
    }
  }

  // Reset the buffer state so we don't send emails again.
  buffer.length = 0;

  if (!resend || !NOTIFICATION_EMAIL) {
    console.log("[EMAIL FLUSH] Skipped: Resend or notification email not configured.");
    return { status: "skipped", reason: "Resend not configured" };
  }

  try {
    const finalSubject = primaryEmail.subject;

    const { data, error } = await resend.emails.send({
      from: "BugBot <bugbot@lwshakib.site>",
      to: [NOTIFICATION_EMAIL],
      subject: finalSubject,
      html: combinedHtml,
    });
    if (error) {
      console.error("[EMAIL FLUSH] Error sending consolidated email:", error.message);
      return { status: "error", message: error.message };
    }
    console.log("[EMAIL FLUSH] Successfully sent consolidated email. ID:", data?.id);
    return { status: "success", id: data?.id };
  } catch (e: any) {
    console.error("[EMAIL FLUSH] Exception sending consolidated email:", e.message);
    return { status: "error", message: e.message };
  }
}
