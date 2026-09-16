import { AuthForm } from "@/components/features/auth/AuthForm";
import { GoogleSignInButton, OrDivider } from "@/components/features/auth/GoogleSignInButton";
import { Wordmark } from "@/components/ui/Logo";
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
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex justify-center mb-10">
          <Wordmark size="lg" />
        </Link>

        <p className="label-caps text-brass text-center mb-3">Welcome back</p>
        <h1 className="display-serif text-[30px] text-sand text-center mb-8">
          Sign in
        </h1>

        <div className="rounded-[4px] border border-surface-border bg-surface p-7 space-y-5">
          {errorMessage && (
            <div className="rounded-[3px] bg-maroon-muted px-4 py-3 text-[13px] text-sand">
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
