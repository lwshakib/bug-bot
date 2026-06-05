import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { queueEmail } from "../../utils/email.js";

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
    queueEmail(subject, html);
    return { status: "success", message: "Email queued for consolidated delivery" };
  }
});
