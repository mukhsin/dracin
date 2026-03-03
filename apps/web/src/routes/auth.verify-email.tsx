import { createFileRoute, Link, useSearch } from "@tanstack/react-router";

type VerifyEmailSearch = {
  email?: string;
  redirect?: string;
};

export const Route = createFileRoute("/auth/verify-email")({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const search = useSearch({ strict: false }) as VerifyEmailSearch;
  const email = typeof search.email === "string" ? search.email : null;
  const redirect =
    typeof search.redirect === "string" &&
    search.redirect.startsWith("/") &&
    !search.redirect.startsWith("//")
      ? search.redirect
      : undefined;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto flex items-start justify-center px-4 pt-32">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">
            Check your inbox
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a verification email
            {email ? (
              <>
                {" "}
                to <span className="font-medium text-foreground">{email}</span>
              </>
            ) : null}
            . Open the message and click the verification link to activate your
            account.
          </p>

          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Next steps</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>Open your inbox and look for a message from Dracin.</li>
              <li>Click the verification link in that email.</li>
              <li>
                After verification, sign in with your email and password to
                continue.
              </li>
            </ol>
          </div>

          <div className="mt-6 space-y-3">
            <Link
              to="/auth/signin"
              search={{ redirect }}
              className="block w-full rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to sign in
            </Link>

            <Link
              to="/auth/signup"
              search={{ redirect }}
              className="block w-full rounded-lg border border-input bg-background px-4 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Use a different email
            </Link>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Don&apos;t see the email? Check your spam folder, then try signing
            up again if needed.
          </p>
        </div>
      </div>
    </div>
  );
}
