/**
 * Page title block, shared by every route so headings stay typographically
 * consistent. `actions` sits to the right on wide screens and stacks below on
 * phones, which is the arrangement most pages were hand-rolling already.
 */
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="page-enter flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-ink-900 sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-col gap-2 sm:flex-row">{actions}</div>}
    </header>
  )
}