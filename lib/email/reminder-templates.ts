function safe(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// ─── Employee reminder ───────────────────────────────────────────────────────

export interface ReminderItem {
  item_name: string;
  deadline: string;
  status: string;
}

export interface EmployeeReminderData {
  employeeName: string;
  employeeEmail: string;
  companyName: string;
  startDate: string;
  onboardingId: string;
  appUrl: string;
  items: ReminderItem[];
}

export function buildEmployeeReminderEmail(data: EmployeeReminderData): {
  subject: string;
  html: string;
} {
  const { employeeName, companyName, startDate, onboardingId, appUrl, items } = data;

  const itemRows = items
    .map((item) => {
      const daysLeft = Math.ceil(
        (new Date(item.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const urgency = daysLeft <= 1 ? '#dc2626' : daysLeft <= 2 ? '#d97706' : '#6b7280';
      const label = daysLeft <= 0 ? 'Due today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
            <span style="font-size:14px;color:#111827;">${safe(item.item_name)}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;">
            <span style="font-size:13px;color:${urgency};font-weight:600;">${label}</span>
          </td>
        </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        
        <tr>
          <td style="background:#4f46e5;padding:24px 32px;">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">${safe(companyName)}</p>
            <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px;">Onboarding reminder</p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${safe(employeeName)},</p>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
              You have items to complete before your start date of
              <strong style="color:#111827;">${formatDate(startDate)}</strong>.
              The following ${items.length === 1 ? 'item is' : 'items are'} coming up soon:
            </p>

            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
            </table>

            <div style="margin-top:28px;text-align:center;">
              <a href="${safe(appUrl)}/employee/onboarding/${safe(onboardingId)}"
                 style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;text-decoration:none;">
                Complete your onboarding
              </a>
            </div>

            <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
              If you have already submitted these items, you can ignore this reminder.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject: `Action needed: complete your onboarding for ${companyName}`,
    html,
  };
}

// ─── Employer escalation ─────────────────────────────────────────────────────

export interface OverdueEntry {
  employeeName: string;
  roleTitle: string;
  startDate: string;
  onboardingId: string;
  overdueItems: string[];
}

export interface EmployerEscalationData {
  employerName: string;
  employerEmail: string;
  companyName: string;
  appUrl: string;
  overdueEntries: OverdueEntry[];
}

export function buildEmployerEscalationEmail(data: EmployerEscalationData): {
  subject: string;
  html: string;
} {
  const { employerName, companyName, appUrl, overdueEntries } = data;

  const entryBlocks = overdueEntries
    .map((entry) => {
      const itemList = entry.overdueItems
        .map((item) => `<li style="margin:4px 0;font-size:13px;color:#374151;">${safe(item)}</li>`)
        .join('');
      return `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px;margin-bottom:12px;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#111827;">
            ${safe(entry.employeeName)}
            <span style="font-weight:400;color:#6b7280;font-size:13px;"> — ${safe(entry.roleTitle)}</span>
          </p>
          <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">
            Start date: ${formatDate(entry.startDate)}
          </p>
          <ul style="margin:0;padding-left:18px;">
            ${itemList}
          </ul>
          <div style="margin-top:12px;">
            <a href="${safe(appUrl)}/dashboard/onboarding/${safe(entry.onboardingId)}"
               style="font-size:13px;color:#4f46e5;text-decoration:none;font-weight:600;">
              Review onboarding →
            </a>
          </div>
        </div>`;
    })
    .join('');

  const totalItems = overdueEntries.reduce((sum, e) => sum + e.overdueItems.length, 0);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <tr>
          <td style="background:#dc2626;padding:24px 32px;">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">${safe(companyName)}</p>
            <p style="margin:4px 0 0;color:#fecaca;font-size:13px;">Overdue onboarding items</p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${safe(employerName)},</p>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
              You have <strong style="color:#dc2626;">${totalItems} overdue item${totalItems === 1 ? '' : 's'}</strong>
              across ${overdueEntries.length} new starter${overdueEntries.length === 1 ? '' : 's'}.
              The employees have been sent reminders automatically, but you may want to follow up directly.
            </p>

            ${entryBlocks}

            <div style="margin-top:28px;text-align:center;">
              <a href="${safe(appUrl)}/dashboard"
                 style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;text-decoration:none;">
                Go to dashboard
              </a>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject: `Action required: ${totalItems} overdue onboarding item${totalItems === 1 ? '' : 's'} at ${companyName}`,
    html,
  };
}