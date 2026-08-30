
import nodemailer, { Transporter } from "nodemailer";

// One transporter per sender, cached — avoids reconnecting to Ethereal on
// every single send when a batch has many emails from the same sender.
const transporterCache = new Map<string, Transporter>();

export function getTransporter(sender: {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
}): Transporter {
  const cached = transporterCache.get(sender.id);
  if (cached) return cached;

  const transporter = nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: false,
    auth: { user: sender.smtpUser, pass: sender.smtpPass },
  });

  transporterCache.set(sender.id, transporter);
  return transporter;
}

export interface MailAttachment {
  filename: string;
  /** Absolute path on local disk — nodemailer reads and streams the file itself. */
  path: string;
  contentType?: string;
}

export async function sendEmail(params: {
  sender: { id: string; smtpHost: string; smtpPort: number; smtpUser: string; smtpPass: string; displayName: string };
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}) {
  const transporter = getTransporter(params.sender);

  const info = await transporter.sendMail({
    from: `"${params.sender.displayName}" <${params.sender.smtpUser}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments?.map((a) => ({
      filename: a.filename,
      path: a.path,
      contentType: a.contentType,
    })),
  });

  // Ethereal gives back a preview URL — handy for demoing that sends really happened.
  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info) || undefined,
  };
}
