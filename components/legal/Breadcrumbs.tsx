import Link from 'next/link'

type Crumb = { name: string; path: string }

export function Breadcrumbs({ items, baseUrl }: { items: Crumb[]; baseUrl: string }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${baseUrl}${item.path}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-fg-muted">
        {items.map((item, i) => (
          <span key={item.path}>
            {i > 0 && <span className="mx-2">/</span>}
            {i === items.length - 1 ? (
              <span className="text-fg-body">{item.name}</span>
            ) : (
              <Link href={item.path} className="hover:text-fg">
                {item.name}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </>
  )
}
