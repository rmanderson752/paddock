import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { MobileNav } from "@/components/layout/MobileNav";

export default function NotFound() {
  return (
    <>
      <HeaderServer />
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <LogoMark size={40} className="mb-8 text-brass" />
        <p className="label-caps text-brass mb-4">Not in the paddock</p>
        <h1 className="display-serif text-[36px] text-sand mb-4">This car isn&apos;t tracked yet.</h1>
        <p className="text-[14px] text-sand-muted mb-8 max-w-sm">
          Try another marque, model or generation — or browse the market.
        </p>
        <div className="flex gap-6">
          <Link href="/browse" className="label-caps rounded-[3px] bg-forest px-5 py-3 text-cream hover:bg-forest-dark transition-colors">
            Browse
          </Link>
          <Link href="/search" className="label-caps px-2 py-3 text-sand-subtle hover:text-sand transition-colors">
            Search
          </Link>
        </div>
      </div>
      <MobileNav />
    </>
  );
}
