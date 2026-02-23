import { redirect } from "@tanstack/react-router";
import { authClient } from "./auth-client";

export async function requireRouteAuth(redirectPath: string) {
  const session = await authClient.getSession();

  if (!session.data?.session || !session.data?.user) {
    const search = new URLSearchParams({ redirect: redirectPath });

    throw redirect({
      href: `/auth/signin?${search.toString()}`,
    });
  }
}
