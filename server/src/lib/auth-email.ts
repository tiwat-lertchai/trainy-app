import nodemailer from "nodemailer";
import { env } from "../config/env";

export interface AuthEmail {
  to: string;
  subject: string;
  text: string;
}

interface MailTransport {
  sendMail(message: AuthEmail & { from: string }): Promise<unknown>;
}

export function createAuthEmailSender(transport: MailTransport, from: string) {
  return async (message: AuthEmail) => {
    await transport.sendMail({ from, ...message });
  };
}

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  requireTLS: !env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

const send = createAuthEmailSender(transport, env.SMTP_FROM);

/** Queue auth mail without extending endpoint timing for known accounts. */
export function queueAuthEmail(message: AuthEmail) {
  void send(message).catch(() => {
    // Never log the recipient, reset token, verification URL, or SMTP error details.
    console.error("Auth email delivery failed");
  });
}
