// components/portability/PortableProfileReview.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { confirmPortableItems } from '@/lib/actions/portability-actions';
import type { ProfileMatchResult, MatchResult } from '@/lib/portability/profile-matcher';
import type { PortableReviewData } from '@/lib/actions/portability-actions';

interface Props {
  onboardingId: string;
  matchResult: ProfileMatchResult;
  maskedData: PortableReviewData['maskedData'];
  employerName: string;
}

export default function PortableProfileReview({
  onboardingId,
  matchResult,
  maskedData,
  employerName,
}: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialise selection state: auto-select items that are defaultSelected
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const item of matchResult.items) {
      if (item.defaultSelected) {
        initial.add(item.checklistItemId);
      }
    }
    return initial;
  });

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Build consent categories from selected items
      const consentCategories = matchResult.items
        .filter((item) => selectedItems.has(item.checklistItemId))
        .map((item) => item.dataCategory);

      const result = await confirmPortableItems(onboardingId, {
        selectedItemIds: Array.from(selectedItems),
        consentCategories,
      });

      if (result.success) {
        router.push(`/employee/onboarding/${onboardingId}`);
      } else {
        setError(result.error || 'Failed to save selections');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Skip pre-population but still need consent before the checklist.
    // Send to the consent gate where they can grant permissions explicitly.
    router.push(`/employee/onboarding/${onboardingId}/consent`);
  };

  const selectedCount = selectedItems.size;
  const { grouped } = matchResult;

  return (
    <div>
      {/* Portable items (universal) */}
      {grouped.universal.length > 0 && (
        <CategorySection
          title="Always the same"
          subtitle="This data never changes between employers"
          items={grouped.universal}
          selectedItems={selectedItems}
          onToggle={toggleItem}
          maskedData={maskedData}
          badgeColor="var(--status-approved)"
          badgeBg="rgba(93, 202, 165, 0.15)"
        />
      )}

      {/* Portable items (likely stable) */}
      {grouped.likely_stable.length > 0 && (
        <CategorySection
          title="Confirm or update"
          subtitle="This data may have changed since your last role"
          items={grouped.likely_stable}
          selectedItems={selectedItems}
          onToggle={toggleItem}
          maskedData={maskedData}
          badgeColor="var(--status-pending)"
          badgeBg="rgba(250, 199, 117, 0.15)"
        />
      )}

      {/* Time-sensitive items */}
      {grouped.time_sensitive.length > 0 && (
        <CategorySection
          title="Time-sensitive"
          subtitle="These documents have expiry dates — check they're still valid"
          items={grouped.time_sensitive}
          selectedItems={selectedItems}
          onToggle={toggleItem}
          maskedData={maskedData}
          badgeColor="var(--status-rejected)"
          badgeBg="rgba(240, 130, 142, 0.15)"
        />
      )}

      {/* Employer-specific (not portable — info only) */}
      {grouped.employer_specific.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            New for this employer
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            These items are specific to {employerName} and need to be completed fresh
          </p>
          {grouped.employer_specific.map((item) => (
            <div
              key={item.checklistItemId}
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--bg-inset)',
                borderRadius: '8px',
                marginBottom: '8px',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>○</span>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{item.checklistItemName}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Consent notice */}
      <div
        style={{
          padding: '16px',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          marginBottom: '24px',
        }}
      >
        <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: '1.6', margin: 0 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Data sharing consent:</strong> By carrying forward items, you grant{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{employerName}</strong> access to the selected data categories for this onboarding.
          You can withdraw consent at any time from your profile settings.
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(240, 130, 142, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(240, 130, 142, 0.3)',
            marginBottom: '16px',
          }}
        >
          <p style={{ fontSize: '14px', color: 'var(--status-rejected)', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <button
          onClick={handleConfirm}
          disabled={isSubmitting || selectedCount === 0}
          style={{
            flex: 1,
            padding: '14px 24px',
            backgroundColor: selectedCount > 0 ? 'var(--accent)' : 'var(--border-strong)',
            color: 'var(--on-accent)',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: selectedCount > 0 && !isSubmitting ? 'pointer' : 'not-allowed',
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting
            ? 'Saving...'
            : selectedCount > 0
              ? `Carry forward ${selectedCount} item${selectedCount > 1 ? 's' : ''} & continue`
              : 'Select items to carry forward'}
        </button>
        <button
          onClick={handleSkip}
          disabled={isSubmitting}
          style={{
            padding: '14px 24px',
            backgroundColor: 'var(--bg-raised)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-strong)',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 500,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// ── Category Section Sub-component ─────────────────────────────────────────

function CategorySection({
  title,
  subtitle,
  items,
  selectedItems,
  onToggle,
  maskedData,
  badgeColor,
  badgeBg,
}: {
  title: string;
  subtitle: string;
  items: MatchResult[];
  selectedItems: Set<string>;
  onToggle: (id: string) => void;
  maskedData: PortableReviewData['maskedData'];
  badgeColor: string;
  badgeBg: string;
}) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
        {title}
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>{subtitle}</p>

      {items.map((item) => {
        const isSelected = selectedItems.has(item.checklistItemId);
        const canSelect = item.canPrePopulate;
        const maskedValue = getMaskedValue(item, maskedData);

        return (
          <div
            key={item.checklistItemId}
            onClick={() => canSelect && onToggle(item.checklistItemId)}
            style={{
              padding: '16px',
              backgroundColor: isSelected ? 'rgba(93, 202, 165, 0.1)' : 'var(--bg-raised)',
              borderRadius: '8px',
              marginBottom: '8px',
              border: `2px solid ${isSelected ? 'var(--status-approved)' : 'var(--border)'}`,
              cursor: canSelect ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
              opacity: canSelect ? 1 : 0.6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              {/* Checkbox */}
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '4px',
                  border: `2px solid ${isSelected ? 'var(--status-approved)' : 'var(--border-strong)'}`,
                  backgroundColor: isSelected ? 'var(--status-approved)' : 'var(--bg-raised)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.checklistItemName}
                  </span>
                  {item.hasExistingData && (
                    <span
                      style={{
                        display: 'inline-block',
                        backgroundColor: badgeBg,
                        color: badgeColor,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      On file
                    </span>
                  )}
                </div>

                {/* Masked data preview */}
                {maskedValue && (
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      margin: '4px 0 0 0',
                      fontFamily: 'monospace',
                    }}
                  >
                    {maskedValue}
                  </p>
                )}

                {/* Existing data summary */}
                {item.existingDataSummary && !maskedValue && (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    {item.existingDataSummary}
                  </p>
                )}

                {/* Warning (e.g. expired document) */}
                {item.warning && (
                  <p style={{ fontSize: '13px', color: 'var(--status-rejected)', margin: '6px 0 0 0', fontWeight: 500 }}>
                    ⚠ {item.warning}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Helper: Get masked value for display ───────────────────────────────────

function getMaskedValue(
  item: MatchResult,
  maskedData: PortableReviewData['maskedData']
): string | null {
  if (!item.hasExistingData || item.itemType !== 'form_entry') return null;

  switch (item.formFieldKey) {
    case 'ni_number':
      return maskedData.niNumber;
    case 'bank_details':
      const parts: string[] = [];
      if (maskedData.bankHolderName) parts.push(maskedData.bankHolderName);
      if (maskedData.bankSortCode) parts.push(`Sort: ${maskedData.bankSortCode}`);
      if (maskedData.bankAccountNumber) parts.push(`Acc: ${maskedData.bankAccountNumber}`);
      return parts.length > 0 ? parts.join(' · ') : null;
    case 'emergency_contacts':
      if (maskedData.emergencyContacts.length === 0) return null;
      return maskedData.emergencyContacts
        .map((c) => `${c.name}${c.relationship ? ` (${c.relationship})` : ''}`)
        .join(', ');
    default:
      return null;
  }
}