import { getSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { Header } from "./Header";

export async function HeaderServer() {
  const session = await getSession();
  return (
    <Header
      user={
        session
          ? { name: session.name, email: session.email, avatarUrl: session.avatarUrl ?? null, isAdmin: await isAdmin(session) }
          : null
      }
    />
  );
}
