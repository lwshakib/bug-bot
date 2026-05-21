import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { resend } from "../../client.js";
import { NOTIFICATION_EMAIL } from "../../constants.js";

export const sendEmailTool = defineTool({
  declaration: {
    name: "send_email",
    description: "Sends an email notification using Resend.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        html: { type: Type.STRING }
      },
      required: ["subject", "html"]
    }
  },
  execute: async ({ subject, html }: { subject: string; html: string }) => {
    if (!resend || !NOTIFICATION_EMAIL) return { status: "skipped", reason: "Resend not configured" };
    try {
      const { data, error } = await resend.emails.send({
        from: "Repository Maintainer Bot <bot@lwshakib.site>",
        to: [NOTIFICATION_EMAIL],
        subject,
        html,
      });
      if (error) return { status: "error", message: error.message };
      return { status: "success", id: data?.id };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  }
});
