"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { AuthResult } from "@/lib/auth/actions";

interface AuthFormProps {
  mode: "login" | "signup";
  action: (prevState: AuthResult | null, formData: FormData) => Promise<AuthResult>;
  /** Where to go after a successful sign-in (same-origin path) */
  redirectTo?: string;
}

export function AuthForm({ mode, action, redirectTo }: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);
  const switchHref = redirectTo
    ? `?redirect=${encodeURIComponent(redirectTo)}`
    : "";

  return (
    <form action={formAction} className="space-y-4">
      {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
      {state?.error && (
        <div className="rounded-[3px] bg-maroon-muted px-4 py-3 text-[13px] text-sand">
          {state.error}
        </div>
      )}

      {mode === "signup" && (
        <div>
          <label htmlFor="name" className="block label-caps text-sand-subtle mb-2">
            Name
          </label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Your name"
            required
            autoComplete="name"
          />
        </div>
      )}

      <div>
        <label htmlFor="email" className="block label-caps text-sand-subtle mb-2">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="password" className="block label-caps text-sand-subtle mb-2">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full mt-1"
      >
        {isPending
          ? mode === "login"
            ? "Signing in..."
            : "Creating account..."
          : mode === "login"
          ? "Sign in"
          : "Create account"}
      </Button>

      <div className="text-center pt-2">
        {mode === "login" ? (
          <Link href={`/signup${switchHref}`} className="label-caps text-sand-subtle hover:text-sand transition-colors">
            No account? <span className="text-forest">Sign up</span>
          </Link>
        ) : (
          <Link href={`/login${switchHref}`} className="label-caps text-sand-subtle hover:text-sand transition-colors">
            Have an account? <span className="text-forest">Sign in</span>
          </Link>
        )}
      </div>
    </form>
  );
}
