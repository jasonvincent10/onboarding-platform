import { notFound } from 'next/navigation'
import { getTemplateWithItems } from '@/app/actions/templates'
import { TemplateEditor } from '@/components/templates/TemplateEditor'

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
  const template = await getTemplateWithItems(id)

  if (!template) notFound()

  return <TemplateEditor template={template} />
}
