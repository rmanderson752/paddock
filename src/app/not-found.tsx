import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { MobileNav } from "@/components/layout/MobileNav";

export default function NotFound() {
  return (
    <>
      <HeaderServer />
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <LogoMark size={48} className="mb-6 opacity-30" />
        <h1 className="font-serif text-3xl text-sand mb-2">Not Found</h1>
        <p className="text-sm text-sand-muted mb-2 max-w-sm">
          This car hasn&apos;t been added to Paddock yet.
        </p>
        <p className="text-[12px] text-sand-faint mb-6">
          Try searching for a different make, model, or generation.
        </p>
        <div className="flex gap-3">
          <Link
            href="/"
            className="rounded-full bg-forest px-4 py-2 text-sm text-cream hover:bg-forest-dark transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/search"
            className="rounded-full border border-surface-border px-4 py-2 text-sm text-sand-subtle hover:text-sand hover:border-surface-border-hover transition-colors"
          >
            Search
          </Link>
        </div>
      </div>
      <MobileNav />
    </>
  );
}
