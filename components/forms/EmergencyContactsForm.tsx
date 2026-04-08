'use client';

import { useState, useCallback } from 'react';
import {
  validateContact,
  RELATIONSHIP_OPTIONS,
  type EmergencyContact,
} from '@/lib/validation/emergency-contacts';
import { submitEmergencyContacts } from '@/lib/actions/form-actions';

interface EmergencyContactsFormProps {
  onboardingId: string;
  checklistItemId: string;
  existingContacts: EmergencyContact[] | null;
  onSuccess: () => void;
}

const EMPTY_CONTACT: EmergencyContact = {
  name: '',
  relationship: '',
  phone: '',
  email: '',
};

export default function EmergencyContactsForm({
  onboardingId,
  checklistItemId,
  existingContacts,
  onSuccess,
}: EmergencyContactsFormProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>(
    existingContacts && existingContacts.length > 0
      ? existingContacts
      : [{ ...EMPTY_CONTACT }]
  );
  const [errors, setErrors] = useState<{ [field: string]: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const updateContact = useCallback(
    (index: number, field: keyof EmergencyContact, value: string) => {
      setContacts((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
      setServerError(null);

      // Clear field error on change
      setErrors((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          const fieldErrors = { ...updated[index] };
          delete fieldErrors[field];
          updated[index] = fieldErrors;
        }
        return updated;
      });
    },
    []
  );

  const addContact = useCallback(() => {
    if (contacts.length < 3) {
      setContacts((prev) => [...prev, { ...EMPTY_CONTACT }]);
    }
  }, [contacts.length]);

  const removeContact = useCallback(
    (index: number) => {
      if (contacts.length > 1) {
        setContacts((prev) => prev.filter((_, i) => i !== index));
        setErrors((prev) => prev.filter((_, i) => i !== index));
      }
    },
    [contacts.length]
  );

  const handleSubmit = async () => {
    // Validate all contacts
    const validationResults = contacts.map((c) => validateContact(c));
    setErrors(validationResults.map((r) => r.errors));

    const allValid = validationResults.every((r) => r.valid);
    if (!allValid) return;

    setSubmitting(true);
    setServerError(null);

    const result = await submitEmergencyContacts(onboardingId, checklistItemId, contacts);

    if (result.success) {
      onSuccess();
    } else {
      setServerError(result.error ?? 'Failed to save');
    }

    setSubmitting(false);
  };

  return (
    <div style={{ maxWidth: '560px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Emergency Contacts
      </h2>

      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Please provide at least one emergency contact. This is someone your
        employer can reach if there&apos;s an emergency at work. You can add up to 3 contacts.
      </p>

      {contacts.map((contact, index) => (
        <div
          key={index}
          style={{
            padding: '1rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            backgroundColor: '#fafafa',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Contact {index + 1}
            </span>
            {contacts.length > 1 && (
              <button
                onClick={() => removeContact(index)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Remove
              </button>
            )}
          </div>

          {/* Full Name */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label
              style={{ display: 'block', fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.8125rem' }}
            >
              Full name
            </label>
            <input
              type="text"
              value={contact.name}
              onChange={(e) => updateContact(index, 'name', e.target.value)}
              placeholder="e.g. Jane Smith"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: `1px solid ${errors[index]?.name ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '0.375rem',
                fontSize: '0.9375rem',
              }}
            />
            {errors[index]?.name && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                {errors[index].name}
              </p>
            )}
          </div>

          {/* Relationship */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label
              style={{ display: 'block', fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.8125rem' }}
            >
              Relationship
            </label>
            <select
              value={contact.relationship}
              onChange={(e) => updateContact(index, 'relationship', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: `1px solid ${errors[index]?.relationship ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '0.375rem',
                fontSize: '0.9375rem',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="">Select relationship</option>
              {RELATIONSHIP_OPTIONS.map((rel) => (
                <option key={rel} value={rel}>
                  {rel}
                </option>
              ))}
            </select>
            {errors[index]?.relationship && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                {errors[index].relationship}
              </p>
            )}
          </div>

          {/* Phone */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label
              style={{ display: 'block', fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.8125rem' }}
            >
              Phone number
            </label>
            <input
              type="tel"
              value={contact.phone}
              onChange={(e) => updateContact(index, 'phone', e.target.value)}
              placeholder="e.g. 07700 900000"
              inputMode="tel"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: `1px solid ${errors[index]?.phone ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '0.375rem',
                fontSize: '0.9375rem',
              }}
            />
            {errors[index]?.phone && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                {errors[index].phone}
              </p>
            )}
          </div>

          {/* Email (optional) */}
          <div>
            <label
              style={{ display: 'block', fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.8125rem' }}
            >
              Email{' '}
              <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
            </label>
            <input
              type="email"
              value={contact.email ?? ''}
              onChange={(e) => updateContact(index, 'email', e.target.value)}
              placeholder="e.g. jane@example.com"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: `1px solid ${errors[index]?.email ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '0.375rem',
                fontSize: '0.9375rem',
              }}
            />
            {errors[index]?.email && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                {errors[index].email}
              </p>
            )}
          </div>
        </div>
      ))}

      {/* Add another contact */}
      {contacts.length < 3 && (
        <button
          onClick={addContact}
          style={{
            width: '100%',
            padding: '0.625rem',
            backgroundColor: '#ffffff',
            border: '1px dashed #d1d5db',
            borderRadius: '0.375rem',
            color: '#6b7280',
            fontSize: '0.875rem',
            cursor: 'pointer',
            marginBottom: '1.5rem',
          }}
        >
          + Add another contact ({3 - contacts.length} remaining)
        </button>
      )}

      {/* Server error */}
      {serverError && (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            color: '#dc2626',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {serverError}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: submitting ? '#9ca3af' : '#4f46e5',
          color: '#ffffff',
          border: 'none',
          borderRadius: '0.375rem',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting
          ? 'Saving...'
          : existingContacts && existingContacts.length > 0
          ? 'Update Emergency Contacts'
          : 'Submit Emergency Contacts'}
      </button>
    </div>
  );
}
