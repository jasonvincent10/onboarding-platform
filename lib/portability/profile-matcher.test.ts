import { describe, it, expect } from 'vitest'
import { matchProfileToChecklist, type EmployeeProfileData, type ExistingDocument, type ChecklistItem } from './profile-matcher'

function profile(overrides: Partial<EmployeeProfileData> = {}): EmployeeProfileData {
  return {
    id: 'profile-1',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    date_of_birth: '1990-01-01',
    address: '1 Test St',
    phone: '07000000000',
    ni_number_encrypted: null,
    bank_sort_code_encrypted: null,
    bank_account_number_encrypted: null,
    bank_account_holder_name: null,
    emergency_contacts: null,
    right_to_work_status: null,
    right_to_work_expiry: null,
    ...overrides,
  }
}

function doc(overrides: Partial<ExistingDocument> = {}): ExistingDocument {
  return {
    id: 'doc-1',
    document_type: 'passport',
    data_category: 'right_to_work',
    file_path: 'user/doc.pdf',
    verification_status: 'verified',
    expiry_date: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function item(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: 'item-1',
    item_name: 'Test item',
    item_type: 'form_entry',
    data_category: 'ni_number',
    form_field_key: 'ni_number',
    status: 'not_started',
    ...overrides,
  }
}

describe('matchProfileToChecklist — form fields', () => {
  it('matches NI number when present, and marks it portable + auto-selected', () => {
    const result = matchProfileToChecklist(
      profile({ ni_number_encrypted: 'iv.tag.ciphertext' }),
      [],
      [item({ data_category: 'ni_number', form_field_key: 'ni_number' })]
    )
    const match = result.items[0]
    expect(match.hasExistingData).toBe(true)
    expect(match.canPrePopulate).toBe(true)
    expect(match.defaultSelected).toBe(true)
    expect(match.portabilityType).toBe('universal')
  })

  it('does not match NI number when absent', () => {
    const result = matchProfileToChecklist(
      profile({ ni_number_encrypted: null }),
      [],
      [item({ data_category: 'ni_number', form_field_key: 'ni_number' })]
    )
    expect(result.items[0].hasExistingData).toBe(false)
    expect(result.items[0].canPrePopulate).toBe(false)
  })

  it('requires BOTH sort code and account number for bank details to count as data', () => {
    const onlySortCode = matchProfileToChecklist(
      profile({ bank_sort_code_encrypted: 'iv.tag.x' }),
      [],
      [item({ data_category: 'bank_details', form_field_key: 'bank_details' })]
    )
    expect(onlySortCode.items[0].hasExistingData).toBe(false)

    const both = matchProfileToChecklist(
      profile({
        bank_sort_code_encrypted: 'iv.tag.x',
        bank_account_number_encrypted: 'iv.tag.y',
        bank_account_holder_name: 'Jane Smith',
      }),
      [],
      [item({ data_category: 'bank_details', form_field_key: 'bank_details' })]
    )
    expect(both.items[0].hasExistingData).toBe(true)
    expect(both.items[0].existingDataSummary).toContain('Jane Smith')
  })

  it('matches emergency contacts only when the array is non-empty', () => {
    const empty = matchProfileToChecklist(
      profile({ emergency_contacts: [] }),
      [],
      [item({ data_category: 'emergency_contacts', form_field_key: 'emergency_contacts' })]
    )
    expect(empty.items[0].hasExistingData).toBe(false)

    const withContacts = matchProfileToChecklist(
      profile({
        emergency_contacts: [
          { name: 'Bob Jones', relationship: 'Partner', phone: '07111111111' },
        ],
      }),
      [],
      [item({ data_category: 'emergency_contacts', form_field_key: 'emergency_contacts' })]
    )
    expect(withContacts.items[0].hasExistingData).toBe(true)
    expect(withContacts.items[0].existingDataSummary).toContain('Bob Jones')
  })
})

describe('matchProfileToChecklist — right to work documents (time-sensitive)', () => {
  it('can pre-populate from a valid, non-expired document', () => {
    const future = new Date(Date.now() + 365 * 86_400_000).toISOString().split('T')[0]
    const result = matchProfileToChecklist(
      profile(),
      [doc({ data_category: 'right_to_work', expiry_date: future })],
      [item({ data_category: 'right_to_work', item_type: 'document_upload', form_field_key: null })]
    )
    const match = result.items[0]
    expect(match.hasExistingData).toBe(true)
    expect(match.isExpired).toBe(false)
    expect(match.canPrePopulate).toBe(true)
    expect(match.warning).toBeNull()
  })

  it('blocks pre-population and sets a warning when the document has expired', () => {
    const past = '2020-01-01'
    const result = matchProfileToChecklist(
      profile(),
      [doc({ data_category: 'right_to_work', expiry_date: past })],
      [item({ data_category: 'right_to_work', item_type: 'document_upload', form_field_key: null })]
    )
    const match = result.items[0]
    expect(match.hasExistingData).toBe(true)
    expect(match.isExpired).toBe(true)
    expect(match.canPrePopulate).toBe(false)
    expect(match.warning).toContain('expired')
  })

  it('picks the most recently created document when several exist for the same category', () => {
    const result = matchProfileToChecklist(
      profile(),
      [
        doc({ id: 'old', document_type: 'Old passport', created_at: '2024-01-01T00:00:00Z' }),
        doc({ id: 'new', document_type: 'New passport', created_at: '2026-01-01T00:00:00Z' }),
      ],
      [item({ data_category: 'right_to_work', item_type: 'document_upload', form_field_key: null })]
    )
    expect(result.items[0].existingDocumentId).toBe('new')
  })
})

describe('matchProfileToChecklist — employer-specific categories are never portable', () => {
  it('does not surface a matching document for a non-portable category like "documents"', () => {
    const result = matchProfileToChecklist(
      profile(),
      [doc({ data_category: 'documents', document_type: 'P45' })],
      [item({ data_category: 'documents', item_type: 'document_upload', form_field_key: null })]
    )
    expect(result.items[0].hasExistingData).toBe(false)
    expect(result.items[0].canPrePopulate).toBe(false)
    expect(result.items[0].portabilityType).toBe('employer_specific')
  })

  it('never carries forward a policy acknowledgement, even if one was previously acknowledged', () => {
    const result = matchProfileToChecklist(
      profile(),
      [],
      [item({ data_category: 'policy_acknowledgements', item_type: 'acknowledgement', form_field_key: null })]
    )
    expect(result.items[0].hasExistingData).toBe(false)
    expect(result.items[0].canPrePopulate).toBe(false)
  })

  it('falls back to employer_specific for an unrecognised data_category', () => {
    const result = matchProfileToChecklist(
      profile(),
      [],
      [item({ data_category: 'something_new', item_type: 'document_upload', form_field_key: null })]
    )
    expect(result.items[0].portabilityType).toBe('employer_specific')
    expect(result.items[0].canPrePopulate).toBe(false)
  })
})

describe('matchProfileToChecklist — aggregate result', () => {
  it('computes hasPortableData, prePopulatableCount and grouping across a mixed checklist', () => {
    const result = matchProfileToChecklist(
      profile({ ni_number_encrypted: 'iv.tag.x' }),
      [],
      [
        item({ id: 'a', data_category: 'ni_number', form_field_key: 'ni_number' }),
        item({ id: 'b', data_category: 'documents', item_type: 'document_upload', form_field_key: null }),
        item({ id: 'c', data_category: 'policy_acknowledgements', item_type: 'acknowledgement', form_field_key: null }),
      ]
    )

    expect(result.totalItems).toBe(3)
    expect(result.prePopulatableCount).toBe(1)
    expect(result.hasPortableData).toBe(true)
    expect(result.grouped.universal).toHaveLength(1)
    expect(result.grouped.employer_specific).toHaveLength(2)
  })

  it('reports hasPortableData false when nothing can be carried forward', () => {
    const result = matchProfileToChecklist(
      profile(),
      [],
      [item({ data_category: 'ni_number', form_field_key: 'ni_number' })]
    )
    expect(result.hasPortableData).toBe(false)
    expect(result.prePopulatableCount).toBe(0)
  })
})
