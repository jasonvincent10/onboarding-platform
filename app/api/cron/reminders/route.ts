import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';
import {
  buildEmployeeReminderEmail,
  buildEmployerEscalationEmail,
  type ReminderItem,
  type OverdueEntry,
} from '@/lib/email/reminder-templates';

interface EmployeeReminderGroup {
  onboardingId: string;
  employeeName: string;
  employeeEmail: string;
  companyName: string;
  startDate: string;
  items: ReminderItem[];
}

interface EmployerEscalationGroup {
  employerId: string;
  employerName: string;
  employerEmail: string;
  companyName: string;
  onboardings: Map<string, OverdueEntry>;
}

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'onboarding@resend.dev'; // replace with verified domain before launch
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

// How many days ahead counts as "approaching deadline"
const REMINDER_WINDOW_DAYS = 3;

export async function GET(request: Request) {
  // Verify cron secret so random callers can't trigger this
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const results = {
    employeeRemindersSent: 0,
    employerEscalationsSent: 0,
    errors: [] as string[],
  };

  // ── 1. Employee reminders ──────────────────────────────────────────────────
  // Find items approaching their deadline that are still incomplete.
  // Exclude items already overdue (check-overdue cron handles those separately).
  // Join through onboarding_instances to get employee email + company name.

  const { data: upcomingItems, error: upcomingError } = await supabase
    .from('checklist_items')
    .select(`
      id,
      item_name,
      deadline,
      status,
      onboarding_id,
      onboarding_instances!inner (
        id,
        start_date,
        employee_id,
        employer_id,
        invitee_name,
        invitee_email,
        employer_accounts!inner (
          company_name
        )
      )
    `)
    .in('status', ['not_started', 'in_progress'])
    .gte('deadline', now.toISOString())        // not yet overdue
    .lte('deadline', windowEnd.toISOString()); // within reminder window

  if (upcomingError) {
    results.errors.push(`Upcoming items query failed: ${upcomingError.message}`);
  } else if (upcomingItems && upcomingItems.length > 0) {
    // Group items by onboarding instance so each employee gets ONE email
    const byOnboarding = new Map<string, EmployeeReminderGroup>();

    for (const row of upcomingItems) {
      const instance = row.onboarding_instances as any;
      const key = row.onboarding_id;

      if (!byOnboarding.has(key)) {
        byOnboarding.set(key, {
          onboardingId: key,
          employeeName: instance.invitee_name ?? 'there',
          employeeEmail: instance.invitee_email,
          companyName: (instance.employer_accounts as any)?.company_name ?? 'your new employer',
          startDate: instance.start_date,
          items: [],
        });
      }

      byOnboarding.get(key)!.items.push({
        item_name: row.item_name,
        deadline: row.deadline,
        status: row.status,
      });
    }

    // Send one reminder per employee
    for (const data of byOnboarding.values()) {
      try {
        const { subject, html } = buildEmployeeReminderEmail({
          ...data,
          appUrl: APP_URL,
        });

        await resend.emails.send({
          from: FROM,
          to: data.employeeEmail,
          subject,
          html,
        });

        results.employeeRemindersSent++;
      } catch (err: any) {
        results.errors.push(
          `Employee reminder failed for ${data.employeeEmail}: ${err?.message ?? String(err)}`
        );
      }
    }
  }

  // ── 2. Employer escalations ────────────────────────────────────────────────
  // Find all overdue items and group by employer.
  // The check-overdue cron has already set status='overdue' on these rows.
  // We send the employer a summary so they can chase manually if needed.

  const { data: overdueItems, error: overdueError } = await supabase
    .from('checklist_items')
    .select(`
      id,
      item_name,
      onboarding_id,
      onboarding_instances!inner (
        id,
        start_date,
        role_title,
        invitee_name,
        employer_id,
        employer_accounts!inner (
          company_name
        ),
        employer_members!inner (
          full_name,
          email
        )
      )
    `)
    .eq('status', 'overdue');

  if (overdueError) {
    results.errors.push(`Overdue items query failed: ${overdueError.message}`);
  } else if (overdueItems && overdueItems.length > 0) {
    // Group by employer_id
    const byEmployer = new Map<string, EmployerEscalationGroup>();

    for (const row of overdueItems) {
      const instance = row.onboarding_instances as any;
      const empId: string = instance.employer_id;

      if (!byEmployer.has(empId)) {
        // employer_members may be an array — take the first (owner)
        const member = Array.isArray(instance.employer_members)
          ? instance.employer_members[0]
          : instance.employer_members;

        byEmployer.set(empId, {
          employerId: empId,
          employerName: member?.full_name ?? 'there',
          employerEmail: member?.email ?? '',
          companyName: (instance.employer_accounts as any)?.company_name ?? 'your company',
          onboardings: new Map(),
        });
      }

      const employerData = byEmployer.get(empId)!;
      const onboardingKey = row.onboarding_id;

      if (!employerData.onboardings.has(onboardingKey)) {
        employerData.onboardings.set(onboardingKey, {
          employeeName: instance.invitee_name,
          roleTitle: instance.role_title ?? 'New starter',
          startDate: instance.start_date,
          onboardingId: onboardingKey,
          overdueItems: [],
        });
      }

      employerData.onboardings.get(onboardingKey)!.overdueItems.push(row.item_name);
    }

    // Send one escalation email per employer
    for (const data of byEmployer.values()) {
      if (!data.employerEmail) {
        results.errors.push(`No email found for employer ${data.employerId} — skipping escalation`);
        continue;
      }

      try {
        const { subject, html } = buildEmployerEscalationEmail({
          employerName: data.employerName,
          employerEmail: data.employerEmail,
          companyName: data.companyName,
          appUrl: APP_URL,
          overdueEntries: Array.from(data.onboardings.values()),
        });

        await resend.emails.send({
          from: FROM,
          to: data.employerEmail,
          subject,
          html,
        });

        results.employerEscalationsSent++;
      } catch (err: any) {
        results.errors.push(
          `Employer escalation failed for ${data.employerEmail}: ${err?.message ?? String(err)}`
        );
      }
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    ...results,
  });
}