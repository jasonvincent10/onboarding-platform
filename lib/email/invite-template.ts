interface InviteEmailParams {
  inviteeName: string
  companyName: string
  roleTitle: string
  startDate: string
  inviteUrl: string
}

export function buildInviteEmailHtml({
  inviteeName,
  companyName,
  roleTitle,
  startDate,
  inviteUrl,
}: InviteEmailParams): string {
  const formattedDate = new Date(startDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Escape any HTML in user-supplied strings to prevent injection
  const safe = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Complete your onboarding — ${safe(companyName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:560px;">

          <!-- Logo / header bar -->
          <tr>
            <td style="background-color:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0;">
              <p style="margin:0;color:#64748b;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                New Starter Onboarding
              </p>
              <p style="margin:6px 0 0;color:#f8fafc;font-size:20px;font-weight:700;letter-spacing:-0.01em;">
                ${safe(companyName)}
              </p>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 32px;">

              <p style="margin:0 0 6px;color:#64748b;font-size:14px;">
                Hi ${safe(inviteeName)},
              </p>
              <h1 style="margin:0 0 20px;color:#0f172a;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.01em;">
                Welcome to the team.<br/>Let&#39;s get your paperwork sorted.
              </h1>
              <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.65;">
                ${safe(companyName)} uses Onboarder to collect new starter documents securely online.
                It takes around 10 minutes and everything is encrypted and belongs to you — not your employer.
              </p>

              <!-- Role/date card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:32px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="50%" style="padding-right:12px;">
                          <p style="margin:0 0 4px;color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                            Role
                          </p>
                          <p style="margin:0;color:#1e293b;font-size:15px;font-weight:600;">
                            ${safe(roleTitle)}
                          </p>
                        </td>
                        <td width="50%" style="padding-left:12px;border-left:1px solid #e2e8f0;">
                          <p style="margin:0 0 4px;color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                            Start Date
                          </p>
                          <p style="margin:0;color:#1e293b;font-size:15px;font-weight:600;">
                            ${safe(formattedDate)}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}"
                      style="display:inline-block;background-color:#0f172a;color:#f8fafc;text-decoration:none;
                             font-size:15px;font-weight:600;padding:15px 36px;border-radius:8px;
                             letter-spacing:0.01em;">
                      Complete your onboarding &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
                If the button doesn&#39;t work, copy and paste this link into your browser:<br/>
                <a href="${inviteUrl}" style="color:#64748b;word-break:break-all;">${inviteUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-top:none;
                       padding:20px 32px;border-radius:0 0 12px 12px;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                This link is unique to you and remains active until your start date.
                If you weren&#39;t expecting this email, you can safely ignore it.<br/><br/>
                Sent via <strong style="color:#64748b;">Onboarder</strong> on behalf of
                ${safe(companyName)}. Your data is encrypted and belongs to you.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
