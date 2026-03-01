import { FormEvent, useMemo, useState } from "react";
import {
  createFileRoute,
  Link,
  useLocation,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { FcGoogle } from "react-icons/fc";
import authClient from "../lib/auth-client.js";
type SignInSearch = {
  redirect?: string;
};

export const Route = createFileRoute("/auth/signin")({
  component: SignInPage,
});

function SignInPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as SignInSearch;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialSubmitting, setIsSocialSubmitting] = useState(false);

  const redirectTo = useMemo(() => {
    // Check location.state first (from modal), then URL search params
    const value = location.state?.redirect || search.redirect;

    if (!value || typeof value !== "string") {
      return "/dramas";
    }

    if (!value.startsWith("/") || value.startsWith("//")) {
      return "/dramas";
    }

    return value;
  }, [location.state?.redirect, search.redirect]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (result.error) {
        setError(result.error.message || "Invalid email or password.");
        return;
      }

      await navigate({ to: redirectTo });
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Sign in failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSocialSubmitting(true);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        // Pass absolute URL with frontend origin for post-OAuth redirect
        callbackURL: `${window.location.origin}${redirectTo}`,
      });

      if (result.error) {
        setError(
          result.error.message ||
            "Could not start Google sign in. Please try again.",
        );
      }
    } catch {
      setError("Could not start Google sign in. Please try again.");
    } finally {
      setIsSocialSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto flex items-start justify-center px-4 pt-32">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">Sign In</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your email and password to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your password"
                required
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || isSocialSubmitting}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting || isSocialSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FcGoogle className="w-4 h-4" />
              {isSocialSubmitting
                ? "Connecting to Google..."
                : "Continue with Google"}
            </button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              to="/auth/signup"
              search={{
                redirect: redirectTo === "/dramas" ? undefined : redirectTo,
              }}
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
