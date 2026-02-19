/**
 * Email via Resend (https://resend.com)
 * Env: RESEND_API_KEY
 * From address: RESEND_FROM (default: nyx@spygroup.dev)
 */
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
export const FROM = process.env.RESEND_FROM || 'NYX <nyx@spygroup.dev>';

/**
 * Send an email. Returns { id } on success, throws on failure.
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY) {
    // Dev mode: just log
    console.log(`[email] RESEND_API_KEY not set — would send to ${to}: ${subject}`);
    return { id: 'dev-noop' };
  }
  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html, text });
  if (error) throw new Error(error.message || 'Failed to send email');
  return data;
}
