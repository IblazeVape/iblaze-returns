import Mailjet from "node-mailjet";

let mailjetClient: ReturnType<typeof Mailjet.apiConnect> | null = null;

function getClient() {
  if (!mailjetClient) {
    mailjetClient = Mailjet.apiConnect(
      process.env.MAILJET_API_KEY!,
      process.env.MAILJET_SECRET_KEY!
    );
  }
  return mailjetClient;
}

interface SendEmailOptions {
  toEmail: string;
  subject: string;
  html: string;
}

export async function sendEmail({ toEmail, subject, html }: SendEmailOptions) {
  const client = getClient();
  try {
    const result = await client.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_SENDER_EMAIL,
            Name: "iBlaze Vape",
          },
          To: [{ Email: toEmail }],
          Subject: subject,
          HTMLPart: html,
        },
      ],
    });
    return result.body;
  } catch (err: unknown) {
    const error = err as { statusCode?: number };
    console.error("Mailjet Error:", error.statusCode);
    throw new Error("Failed to send email notification.");
  }
}
