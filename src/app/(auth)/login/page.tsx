import { AuthForm } from "@/components/features/auth/AuthForm";
import { LogoMark } from "@/components/ui/Logo";
import { login } from "@/lib/auth/actions";
import Link from "next/link";
import { safeRedirectPath } from "@/lib/auth/redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  const redirectTo = safeRedirectPath(redirect, "");
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <LogoMark size={28} />
          <span className="font-serif text-2xl text-sand">Paddock</span>
        </Link>

        <h1 className="font-serif text-xl text-sand text-center mb-6">
          Sign in to your account
        </h1>

        <div className="rounded-xl border-[0.5px] border-surface-border bg-surface p-6">
          <AuthForm mode="login" action={login} redirectTo={redirectTo || undefined} />
        </div>
      </div>
    </div>
  );
}
