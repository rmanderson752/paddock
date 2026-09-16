import { AuthForm } from "@/components/features/auth/AuthForm";
import { GoogleSignInButton, OrDivider } from "@/components/features/auth/GoogleSignInButton";
import { Wordmark } from "@/components/ui/Logo";
import { signup } from "@/lib/auth/actions";
import { isGoogleConfigured } from "@/lib/auth/google";
import Link from "next/link";
import { safeRedirectPath } from "@/lib/auth/redirect";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  const redirectTo = safeRedirectPath(redirect, "");
  const googleEnabled = isGoogleConfigured();
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex justify-center mb-10">
          <Wordmark size="lg" />
        </Link>

        <p className="label-caps text-brass text-center mb-3">Join the paddock</p>
        <h1 className="display-serif text-[30px] text-sand text-center mb-8">
          Create your account
        </h1>

        <div className="rounded-[4px] border border-surface-border bg-surface p-7 space-y-5">
          {googleEnabled && (
            <>
              <GoogleSignInButton redirectTo={redirectTo || undefined} label="Sign up with Google" />
              <OrDivider />
            </>
          )}
          <AuthForm mode="signup" action={signup} redirectTo={redirectTo || undefined} />
        </div>
      </div>
    </div>
  );
}
