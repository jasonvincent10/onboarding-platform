interface TeamInviteEmailParams {
  companyName: string
  inviterName: string
  inviteUrl: string
}

export function buildTeamInviteEmailHtml({
  companyName,
  inviterName,
  inviteUrl,
}: TeamInviteEmailParams): string {
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
  <title>Join ${safe(companyName)} on Onboarder</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:560px;">

          <tr>
            <td style="background-color:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0;">
              <p style="margin:0;color:#64748b;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                Team invitation
              </p>
              <p style="margin:6px 0 0;color:#f8fafc;font-size:20px;font-weight:700;letter-spacing:-0.01em;">
                ${safe(companyName)}
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#ffffff;padding:36px 32px;">
              <h1 style="margin:0 0 20px;color:#0f172a;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.01em;">
                ${safe(inviterName)} has invited you to join ${safe(companyName)} on Onboarder.
              </h1>
              <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.65;">
                You&#39;ll be able to invite new starters, review their documents, and manage
                onboardings together.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}"
                      style="display:inline-block;background-color:#0f172a;color:#f8fafc;text-decoration:none;
                             font-size:15px;font-weight:600;padding:15px 36px;border-radius:8px;
                             letter-spacing:0.01em;">
                      Accept invitation &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
                If the button doesn&#39;t work, copy and paste this link into your browser:<br/>
                <a href="${inviteUrl}" style="color:#64748b;word-break:break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-top:none;
                       padding:20px 32px;border-radius:0 0 12px 12px;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                If you weren&#39;t expecting this, you can safely ignore this email.
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
