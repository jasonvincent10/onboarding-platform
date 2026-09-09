import { notFound, redirect } from 'next/navigation'
import { getTemplateWithItems } from '@/app/actions/templates'
import { TemplateEditor, type LinkableRequirement } from '@/components/templates/TemplateEditor'
import { getEmployerContext } from '@/lib/entitlements'
import { loadLinkableRequirements } from '@/lib/compliance/onboarding-sync'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const template = await getTemplateWithItems(id)
  return {
    title: template ? `Edit: ${template.template_name}` : 'Template not found',
  }
}

export default async function TemplateEditorPage({ params }: Props) {
  const { id } = await params
  const ctx = await getEmployerContext()
  if (!ctx) redirect('/login')

  const template = await getTemplateWithItems(id)
  if (!template) notFound()

  // Offered whatever the plan, since a template built now should keep working
  // if compliance is added later. The records it creates only become visible
  // once the plan includes compliance.
  const requirements: LinkableRequirement[] = (await loadLinkableRequirements(ctx.employerId)).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
  }))

  return <TemplateEditor template={template} requirements={requirements} />
}
