'use client'

import { useState, useTransition, useOptimistic } from 'react'
import Link from 'next/link'
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Pencil,
  Loader2,
  Check,
  ArrowLeft,
  FileUp,
  FormInput,
  ScrollText,
  X,
  GripVertical,
  Star,
} from 'lucide-react'
import {
  addTemplateItem,
  updateTemplateItem,
  deleteTemplateItem,
  reorderTemplateItems,
  updateTemplate,
  type Template,
  type TemplateItem,
  type ItemType,
  type DataCategory,
} from '@/app/actions/templates'

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_TYPE_OPTIONS: { value: ItemType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'document_upload',
    label: 'Document upload',
    icon: <FileUp className="w-4 h-4" />,
    description: 'Employee uploads a file (PDF, JPG, PNG)',
  },
  {
    value: 'form',
    label: 'Form entry',
    icon: <FormInput className="w-4 h-4" />,
    description: 'Employee fills in structured fields',
  },
  {
    value: 'acknowledgement',
    label: 'Acknowledgement',
    icon: <ScrollText className="w-4 h-4" />,
    description: 'Employee reads and confirms they agree',
  },
]

const DATA_CATEGORY_OPTIONS: { value: DataCategory; label: string }[] = [
  { value: 'personal_info', label: 'Personal information' },
  { value: 'ni_number', label: 'National Insurance number' },
  { value: 'bank_details', label: 'Bank details' },
  { value: 'emergency_contacts', label: 'Emergency contacts' },
  { value: 'right_to_work', label: 'Right to work' },
  { value: 'documents', label: 'General documents' },
  { value: 'policy_acknowledgements', label: 'Policy acknowledgements' },
]

const ITEM_TYPE_ICONS: Record<ItemType, React.ReactNode> = {
  document_upload: <FileUp className="w-3.5 h-3.5" />,
  form: <FormInput className="w-3.5 h-3.5" />,
  acknowledgement: <ScrollText className="w-3.5 h-3.5" />,
}

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  document_upload: 'Upload',
  form: 'Form',
  acknowledgement: 'Acknowledgement',
}

const ITEM_TYPE_COLOURS: Record<ItemType, string> = {
  document_upload: 'bg-blue-50 text-blue-700 border-blue-200',
  form: 'bg-violet-50 text-violet-700 border-violet-200',
  acknowledgement: 'bg-amber-50 text-amber-700 border-amber-200',
}

// ─── Item Form ────────────────────────────────────────────────────────────────

interface ItemFormValues {
  item_name: string
  description: string
  item_type: ItemType
  data_category: DataCategory
  deadline_days_before_start: number
}

const DEFAULT_FORM_VALUES: ItemFormValues = {
  item_name: '',
  description: '',
  item_type: 'document_upload',
  data_category: 'documents',
  deadline_days_before_start: 3,
}

interface ItemFormProps {
  initial?: Partial<ItemFormValues>
  onSubmit: (values: ItemFormValues) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

function ItemForm({ initial, onSubmit, onCancel, submitLabel }: ItemFormProps) {
  const [values, setValues] = useState<ItemFormValues>({
    ...DEFAULT_FORM_VALUES,
    ...initial,
  })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.item_name.trim()) {
      setError('Item name is required')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await onSubmit(values)
      } catch (err: any) {
        setError(err.message ?? 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Item name */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          Item name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={values.item_name}
          onChange={(e) => set('item_name', e.target.value)}
          placeholder="e.g. Upload your P45"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder:text-slate-400"
          autoFocus
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          Description{' '}
          <span className="text-slate-400 font-normal">(shown to employee)</span>
        </label>
        <textarea
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Explain what this is and why it's needed…"
          rows={2}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder:text-slate-400 resize-none"
        />
      </div>

      {/* Item type */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ITEM_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set('item_type', opt.value)}
              className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border text-center transition-all ${
                values.item_type === opt.value
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {opt.icon}
              <span className="text-xs font-medium leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          {ITEM_TYPE_OPTIONS.find((o) => o.value === values.item_type)?.description}
        </p>
      </div>

      {/* Data category + deadline in a row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Data category
          </label>
          <select
            value={values.data_category}
            onChange={(e) => set('data_category', e.target.value as DataCategory)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          >
            {DATA_CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Deadline
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={90}
              value={values.deadline_days_before_start}
              onChange={(e) =>
                set('deadline_days_before_start', parseInt(e.target.value, 10) || 0)
              }
              className="w-full pl-3 pr-16 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
              days before
            </span>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: TemplateItem
  index: number
  total: number
  templateId: string
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, values: ItemFormValues) => Promise<void>
}

function ItemRow({
  item,
  index,
  total,
  templateId,
  onMoveUp,
  onMoveDown,
  onDelete,
  onUpdate,
}: ItemRowProps) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteTemplateItem(item.id, templateId)
      onDelete(item.id)
    })
  }

  const categoryLabel =
    DATA_CATEGORY_OPTIONS.find((c) => c.value === item.data_category)?.label ??
    item.data_category

  if (editing) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Editing item
        </p>
        <ItemForm
          initial={{
            item_name: item.item_name,
            description: item.description ?? '',
            item_type: item.item_type,
            data_category: item.data_category,
            deadline_days_before_start: item.deadline_days_before_start,
          }}
          onSubmit={async (values) => {
            await onUpdate(item.id, values)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
          submitLabel="Save changes"
        />
      </div>
    )
  }

  return (
    <div
      className={`group flex items-start gap-3 bg-white border rounded-xl px-4 py-3.5 transition-all ${
        isDeleting ? 'opacity-40 pointer-events-none' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Drag handle / number */}
      <div className="flex flex-col items-center gap-0.5 pt-0.5 shrink-0">
        <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
        <span className="text-[10px] font-medium text-slate-400 tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-900">
            {item.item_name}
          </span>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium border px-1.5 py-0.5 rounded-full ${
              ITEM_TYPE_COLOURS[item.item_type]
            }`}
          >
            {ITEM_TYPE_ICONS[item.item_type]}
            {ITEM_TYPE_LABELS[item.item_type]}
          </span>
        </div>

        {item.description && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {item.description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2">
          <span className="text-[11px] text-slate-400">{categoryLabel}</span>
          <span className="text-[11px] text-slate-300">·</span>
          <span className="text-[11px] text-slate-400">
            Due {item.deadline_days_before_start} day
            {item.deadline_days_before_start !== 1 ? 's' : ''} before start
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onMoveUp(item.id)}
          disabled={index === 0}
          title="Move up"
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onMoveDown(item.id)}
          disabled={index === total - 1}
          title="Move down"
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setEditing(true)}
          title="Edit item"
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1 ml-1">
            <span className="text-xs text-red-600 font-medium">Delete?</span>
            <button
              onClick={handleDelete}
              className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete item"
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Template Name Editor ─────────────────────────────────────────────────────

function TemplateNameEditor({ template }: { template: Template }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(template.template_name)
  const [roleType, setRoleType] = useState(template.role_type ?? '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSave() {
    if (!name.trim()) return
    startTransition(async () => {
      await updateTemplate(template.id, {
        template_name: name,
        role_type: roleType,
      })
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  if (editing) {
    return (
      <div className="flex items-start gap-3 flex-wrap">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-xl font-semibold text-slate-900 border-b-2 border-slate-900 focus:outline-none bg-transparent min-w-48"
          autoFocus
        />
        <input
          type="text"
          value={roleType}
          onChange={(e) => setRoleType(e.target.value)}
          placeholder="Role type (optional)"
          className="text-sm text-slate-500 border-b border-slate-300 focus:outline-none bg-transparent focus:border-slate-500 min-w-40"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-1 text-sm font-medium text-white bg-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Save
          </button>
          <button
            onClick={() => {
              setEditing(false)
              setName(template.template_name)
              setRoleType(template.role_type ?? '')
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">{name}</h1>
          {template.is_default && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              Default template
            </span>
          )}
          {saved && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <Check className="w-3 h-3" />
              Saved
            </span>
          )}
        </div>
        {roleType && (
          <p className="text-sm text-slate-500 mt-0.5">{roleType}</p>
        )}
      </div>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition-all"
        title="Edit template name"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TemplateEditor({ template }: { template: Template }) {
  const [items, setItems] = useState<TemplateItem[]>(
    template.template_items ?? []
  )
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSavingOrder, startOrderTransition] = useTransition()

  function moveItem(id: string, direction: 'up' | 'down') {
    setItems((prev) => {
      const idx = prev.findIndex((item) => item.id === id)
      if (idx === -1) return prev
      const next = [...prev]
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]

      // Persist to DB
      startOrderTransition(async () => {
        await reorderTemplateItems(
          template.id,
          next.map((i) => i.id)
        )
      })

      return next
    })
  }

  async function handleAddItem(values: ItemFormValues) {
    const newItem = await addTemplateItem(template.id, values)
    setItems((prev) => [...prev, newItem])
    setShowAddForm(false)
  }

  async function handleUpdateItem(id: string, values: ItemFormValues) {
    await updateTemplateItem(id, template.id, values)
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              item_name: values.item_name,
              description: values.description || null,
              item_type: values.item_type,
              data_category: values.data_category,
              deadline_days_before_start: values.deadline_days_before_start,
            }
          : item
      )
    )
  }

  function handleDeleteItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Back nav */}
        <Link
          href="/templates"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          All templates
        </Link>

        {/* Template header */}
        <div className="flex items-start justify-between mb-8">
          <TemplateNameEditor template={template} />
          {isSavingOrder && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving order…
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-6 px-4 py-3 bg-white rounded-xl border border-slate-200">
          <div className="text-center">
            <div className="text-lg font-semibold text-slate-900">
              {items.length}
            </div>
            <div className="text-xs text-slate-400">
              {items.length === 1 ? 'item' : 'items'}
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <div className="text-lg font-semibold text-slate-900">
              {items.filter((i) => i.item_type === 'document_upload').length}
            </div>
            <div className="text-xs text-slate-400">uploads</div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <div className="text-lg font-semibold text-slate-900">
              {items.filter((i) => i.item_type === 'form').length}
            </div>
            <div className="text-xs text-slate-400">forms</div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <div className="text-lg font-semibold text-slate-900">
              {items.filter((i) => i.item_type === 'acknowledgement').length}
            </div>
            <div className="text-xs text-slate-400">acknowledgements</div>
          </div>
        </div>

        {/* Items list */}
        {items.length === 0 && !showAddForm ? (
          <div className="text-center py-14 bg-white rounded-xl border border-dashed border-slate-300 mb-4">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Plus className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              No checklist items yet
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              Add the documents, forms, and acknowledgements you need from new
              starters.
            </p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {items.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                index={index}
                total={items.length}
                templateId={template.id}
                onMoveUp={(id) => moveItem(id, 'up')}
                onMoveDown={(id) => moveItem(id, 'down')}
                onDelete={handleDeleteItem}
                onUpdate={handleUpdateItem}
              />
            ))}
          </div>
        )}

        {/* Add item panel */}
        {showAddForm ? (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
              New checklist item
            </p>
            <ItemForm
              onSubmit={handleAddItem}
              onCancel={() => setShowAddForm(false)}
              submitLabel="Add item"
            />
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-white transition-all"
          >
            <Plus className="w-4 h-4" />
            Add checklist item
          </button>
        )}

        {/* Help text */}
        {items.length > 0 && (
          <p className="text-xs text-slate-400 text-center mt-6">
            Use the ↑ ↓ arrows to reorder items · Order is saved automatically
          </p>
        )}
      </div>
    </div>
  )
}
