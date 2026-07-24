import { createTransport, getTestMessageUrl } from 'nodemailer';
import type { CrawlConfig, Finding } from 'pre-release-checker-shared';

export async function sendMailReport(config: CrawlConfig, subject: string, findings: Finding[]): Promise<void> {
  if (!config.mailEnabled || !config.mailHost || !config.mailTo) return;

  const transporter = createTransport({
    host: config.mailHost,
    port: config.mailPort,
    secure: config.mailSecure,
    auth: config.mailUser && config.mailPassword ? { user: config.mailUser, pass: config.mailPassword } : undefined,
  });

  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 } as Record<string, number>;
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;

  const newFindings = findings.filter((f) => f.isNew);
  const text = [
    `pre-release-checker 実行レポート: ${subject}`,
    '',
    `全 Findings: ${findings.length}件`,
    `新規 Findings: ${newFindings.length}件`,
    `Critical: ${counts.Critical}, High: ${counts.High}, Medium: ${counts.Medium}, Low: ${counts.Low}`,
    '',
    '--- 新規・重要な Findings ---',
    ...newFindings
      .slice(0, 20)
      .map((f) => `[${f.severity}] ${f.title} ${f.url ? `(${f.url})` : ''}\n  ${f.description}`),
  ].join('\n');

  try {
    const info = await transporter.sendMail({
      from: config.mailFrom || config.mailUser,
      to: config.mailTo,
      subject: `[pre-release-checker] ${subject} - Findings: ${findings.length}`,
      text,
    });
    const preview = getTestMessageUrl(info) || '';
    console.log('Mail report sent:', info.messageId, preview);
  } catch (err) {
    console.error('Failed to send mail report', err);
  }
}
