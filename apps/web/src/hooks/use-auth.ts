import { signOut, useSession } from "../lib/auth-client";

export function useAuth() {
  const session = useSession();
  const user = session.data?.user ?? null;

  return {
    user,
    isAuthenticated: Boolean(session.data?.session && user),
    isLoading: session.isPending,
    logout: async () => {
      await signOut();
    },
  };
}

export default useAuth;
