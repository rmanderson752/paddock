import { AuthForm } from "@/components/features/auth/AuthForm";
import { GoogleSignInButton, OrDivider } from "@/components/features/auth/GoogleSignInButton";
import { LogoMark } from "@/components/ui/Logo";
import { login } from "@/lib/auth/actions";
import { isGoogleConfigured } from "@/lib/auth/google";
import Link from "next/link";
import { safeRedirectPath } from "@/lib/auth/redirect";

const errorMessages: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_state: "That sign-in link expired — please try again.",
  google_unverified: "Google hasn't verified that email address, so it can't be used to sign in.",
  google_failed: "Google sign-in didn't complete. Please try again.",
  google_unavailable: "Google sign-in isn't set up on this server yet.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;
  const redirectTo = safeRedirectPath(redirect, "");
  const googleEnabled = isGoogleConfigured();
  const errorMessage = error ? errorMessages[error] : undefined;
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

        <div className="rounded-xl border-[0.5px] border-surface-border bg-surface p-6 space-y-4">
          {errorMessage && (
            <div className="rounded-lg bg-maroon-muted border border-surface-border-hover px-4 py-3 text-sm text-sand">
              {errorMessage}
            </div>
          )}
          {googleEnabled && (
            <>
              <GoogleSignInButton redirectTo={redirectTo || undefined} />
              <OrDivider />
            </>
          )}
          <AuthForm mode="login" action={login} redirectTo={redirectTo || undefined} />
        </div>
      </div>
    </div>
  );
}
