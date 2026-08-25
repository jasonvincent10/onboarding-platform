import Link from 'next/link'
import { getTemplates } from '@/app/actions/templates'
import { CreateTemplateForm } from '@/components/templates/CreateTemplateForm'
import { FileText, ChevronRight, Star, Plus } from 'lucide-react'

export const metadata = {
  title: 'Onboarding Templates',
}

export default async function TemplatesPage() {
  const templates = await getTemplates()

  return (
    <div className="min-h-screen bg-ink-inset">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-fg tracking-tight">
              Onboarding Templates
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              Templates define the checklist each new starter receives. You can
              create different templates for different roles.
            </p>
          </div>
          <CreateTemplateForm />
        </div>

        {/* Templates list */}
        {templates.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {templates.map((template) => {
              const itemCount =
                // @ts-ignore — count comes back as [{ count: number }]
                template.template_items?.[0]?.count ?? 0

              return (
                <Link
                  key={template.id}
                  href={`/templates/${template.id}/edit`}
                  className="group flex items-center justify-between bg-ink-raised rounded-xl border border-line px-5 py-4 hover:border-line-strong hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-ink-inset flex items-center justify-center group-hover:bg-line transition-colors">
                      <FileText className="w-5 h-5 text-fg-muted" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-fg text-sm">
                          {template.template_name}
                        </span>
                        {template.is_default && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-status-pending bg-status-pending/10 border border-status-pending/30 px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3 fill-status-pending text-status-pending" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {template.role_type
                          ? `${template.role_type} · `
                          : ''}
                        {itemCount}{' '}
                        {itemCount === 1 ? 'checklist item' : 'checklist items'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-fg-muted group-hover:text-fg-muted transition-colors" />
                </Link>
              )
            })}
          </div>
        )}

        {/* Info callout */}
        <div className="mt-8 rounded-xl bg-brand/10 border border-brand/20 px-5 py-4">
          <p className="text-sm text-fg-body">
            <span className="font-semibold">Tip:</span> The{' '}
            <span className="font-medium">Standard UK Onboarding</span> template
            was created automatically for you. It covers the core documents most
            UK employers need. Edit it, or create role-specific templates
            alongside it.
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 bg-ink-raised rounded-xl border border-dashed border-line-strong">
      <div className="w-12 h-12 bg-ink-inset rounded-xl flex items-center justify-center mx-auto mb-4">
        <FileText className="w-6 h-6 text-fg-muted" />
      </div>
      <h3 className="text-sm font-semibold text-fg mb-1">
        No templates yet
      </h3>
      <p className="text-sm text-fg-muted max-w-xs mx-auto">
        Create your first template to define what documents and information
        you need from new starters.
      </p>
    </div>
  )
}
