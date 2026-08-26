-- Migration 008: "Proof of address" becomes a combined form + document item.
--
-- Previously this template item was a bare document_upload -- the employee
-- just uploaded a utility bill/bank statement with no structured address
-- captured anywhere. Now it's a form_entry (form_field_key = 'address') so
-- the employee fills in address line 1/2, city, postcode alongside
-- uploading the same proof document, both submitted together.

-- 1. Fix already-created default templates (existing employers who signed
-- up before this change) so future invites from them use the new item.
UPDATE template_items
SET item_type = 'form_entry', form_field_key = 'address'
WHERE item_name = 'Proof of address' AND item_type = 'document_upload';

-- 2. Fix the seed function so every new employer signup gets it right.
CREATE OR REPLACE FUNCTION create_default_template(p_employer_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_id UUID;
BEGIN
  INSERT INTO onboarding_templates (employer_id, template_name, role_type, is_default)
  VALUES (p_employer_id, 'Standard UK Onboarding', 'Full-time', true)
  RETURNING id INTO v_template_id;

  INSERT INTO template_items (template_id, item_name, description, item_type, data_category, form_field_key, sort_order, deadline_days_before_start) VALUES
  (v_template_id, 'National Insurance number',
   'Your NI number is on your payslip, P60, or any letter from HMRC. Format: two letters, six numbers, one letter (e.g., QQ 12 34 56 C).',
   'form_entry', 'ni_number', 'ni_number', 1, 7),

  (v_template_id, 'Bank details for payroll',
   'We need your sort code and account number so we can pay you. This must be a UK bank account in your name.',
   'form_entry', 'bank_details', 'bank_details', 2, 7),

  (v_template_id, 'Emergency contact details',
   'Please provide at least one emergency contact with their name, relationship to you, and phone number.',
   'form_entry', 'emergency_contacts', 'emergency_contacts', 3, 3),

  (v_template_id, 'P45 from previous employer',
   'Your previous employer should give you a P45 when you leave. If you don''t have one yet, you can submit it after your start date. Upload as PDF or photo.',
   'document_upload', 'documents', NULL, 4, 0),

  (v_template_id, 'Proof of right to work in the UK',
   'We are legally required to verify your right to work before your first day. Acceptable documents: British or Irish passport, biometric residence permit (BRP), or a share code from the GOV.UK online right to work service.',
   'document_upload', 'right_to_work', NULL, 5, 7),

  (v_template_id, 'Proof of address',
   'A recent utility bill, bank statement, or council tax bill showing your current address. Must be dated within the last 3 months.',
   'form_entry', 'personal_info', 'address', 6, 3),

  (v_template_id, 'Photo ID',
   'A clear photo or scan of your passport, driving licence, or national ID card.',
   'document_upload', 'documents', NULL, 7, 7),

  (v_template_id, 'Employee privacy notice',
   'Please read our privacy notice which explains how we collect, use, and protect your personal data during and after your employment.',
   'acknowledgement', 'policy_acknowledgements', NULL, 8, 3);

  RETURN v_template_id;
END;
$$;
