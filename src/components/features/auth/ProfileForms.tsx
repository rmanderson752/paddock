"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  updateProfile,
  changePassword,
  type ProfileActionResult,
} from "@/lib/auth/profile-actions";

function Notice({ state }: { state: ProfileActionResult | null }) {
  if (!state) return null;
  if (state.error) {
    return (
      <div className="rounded-[3px] bg-maroon-muted px-4 py-3 text-[13px] text-sand">
        {state.error}
      </div>
    );
  }
  if (state.message) {
    return (
      <div className="rounded-[3px] bg-forest-muted px-4 py-3 text-[13px] text-forest">
        {state.message}
      </div>
    );
  }
  return null;
}

export function ProfileDetailsForm({ name, email }: { name: string | null; email: string }) {
  const [state, formAction, isPending] = useActionState(updateProfile, null);

  return (
    <Card>
      <h2 className="label-caps text-sand mb-5">Account details</h2>
      <form action={formAction} className="space-y-4">
        <Notice state={state} />
        <div>
          <label htmlFor="name" className="block label-caps text-sand-subtle mb-2">
            Name
          </label>
          <Input id="name" name="name" defaultValue={name ?? ""} required maxLength={100} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="email" className="block label-caps text-sand-subtle mb-2">
            Email
          </label>
          <Input id="email" value={email} readOnly disabled className="opacity-70" />
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </Card>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, null);

  return (
    <Card>
      <h2 className="label-caps text-sand mb-5">Change password</h2>
      <form action={formAction} className="space-y-4" key={state?.success ? "done" : "edit"}>
        <Notice state={state} />
        <div>
          <label htmlFor="currentPassword" className="block label-caps text-sand-subtle mb-2">
            Current password
          </label>
          <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="newPassword" className="block label-caps text-sand-subtle mb-2">
              New password
            </label>
            <Input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block label-caps text-sand-subtle mb-2">
              Confirm new password
            </label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
          </div>
        </div>
        <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
          {isPending ? "Updating..." : "Update password"}
        </Button>
      </form>
    </Card>
  );
}
