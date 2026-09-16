import Link from "next/link";

interface Crumb {
  href: string;
  label: string;
}

interface PageTitleProps {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  crumbs?: Crumb[];
  aside?: React.ReactNode;
}

// Page opening: breadcrumb in tracked capitals, brass eyebrow, Didone title.
export function PageTitle({ eyebrow, title, description, crumbs, aside }: PageTitleProps) {
  return (
    <div className="pt-10 pb-8 border-b border-surface-border">
      {crumbs && crumbs.length > 0 && (
        <nav className="label-caps text-sand-faint mb-8 flex items-center gap-2">
          {crumbs.map((c, i) => (
            <span key={c.href} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              <Link href={c.href} className="hover:text-sand transition-colors">{c.label}</Link>
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          {eyebrow && <p className="label-caps text-brass mb-4">{eyebrow}</p>}
          <h1 className="display-serif text-[36px] sm:text-[48px] text-sand">{title}</h1>
          {description && <div className="mt-4 text-[15px] text-sand-muted max-w-xl">{description}</div>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </div>
  );
}
