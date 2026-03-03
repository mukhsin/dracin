import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "../components/input-otp.js";

type VerifyEmailSearch = {
  email?: string;
  cooldown?: string;
  redirect?: string;
};

export const Route = createFileRoute("/auth/verify-email")({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as VerifyEmailSearch;
  const email = typeof search.email === "string" ? search.email : null;
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

  const redirect =
    typeof search.redirect === "string" &&
    search.redirect.startsWith("/") &&
    !search.redirect.startsWith("//")
      ? search.redirect
      : undefined;

  const initialCooldown =
    typeof search.cooldown === "string"
      ? Number.parseInt(search.cooldown, 10)
      : 0;

  const signInSearch = useMemo(() => ({ redirect }), [redirect]);

  useEffect(() => {
    if (Number.isNaN(initialCooldown) || initialCooldown <= 0) {
      return;
    }

    setResendCooldown((current) => (current > 0 ? current : initialCooldown));
  }, [initialCooldown]);

  const getAuthErrorMessage = async (
    response: Response,
    fallbackMessage: string,
  ) => {
    const rawText = await response.text();

    if (!rawText) {
      return fallbackMessage;
    }

    try {
      const parsed = JSON.parse(rawText) as {
        code?: string;
        message?: string;
      };

      const normalizedMessage = (parsed.message || "").toLowerCase();

      switch (parsed.code) {
        case "INVALID_OTP":
          return "Invalid or expired code. Please check your email and try again.";
        case "TOO_MANY_ATTEMPTS":
          return "Too many invalid attempts. Please request a new code and try again.";
        case "INVALID_EMAIL":
          return "Email address is invalid. Please return to sign up and try again.";
        default:
          if (
            normalizedMessage.includes("invalid email") ||
            normalizedMessage.includes("[body.email]")
          ) {
            return "Email address is invalid. Please return to sign up and try again.";
          }

          return parsed.message || fallbackMessage;
      }
    } catch {
      if (
        rawText.toLowerCase().includes("invalid email") ||
        rawText.toLowerCase().includes("[body.email]")
      ) {
        return "Email address is invalid. Please return to sign up and try again.";
      }

      return rawText;
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendCooldown]);

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email) {
      setError("Missing email context. Please sign up again.");
      return;
    }

    const normalizedOtp = otp.trim();

    if (!normalizedOtp) {
      setError("Enter the verification code from your email.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/auth/email-otp/verify-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email,
            otp: normalizedOtp,
          }),
        },
      );

      if (!response.ok) {
        setError(
          await getAuthErrorMessage(
            response,
            "Invalid or expired code. Please try again.",
          ),
        );
        return;
      }

      setSuccess("Email verified successfully. Redirecting to sign in...");

      setTimeout(() => {
        void navigate({ to: "/auth/signin", search: signInSearch });
      }, 600);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not verify code. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setSuccess(null);

    if (!email) {
      setError("Missing email context. Please sign up again.");
      return;
    }

    setIsResending(true);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/auth/email-otp/send-verification-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email,
            type: "email-verification",
          }),
        },
      );

      if (!response.ok) {
        setError(
          await getAuthErrorMessage(
            response,
            "Could not resend verification code right now. Please try again.",
          ),
        );
        return;
      }

      setSuccess("A new verification code has been sent to your inbox.");
      setResendCooldown(30);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not resend verification code.",
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto flex items-start justify-center px-4 pt-32">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">
            Verify your email
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a one-time verification code
            {email ? (
              <>
                {" "}
                to <span className="font-medium text-foreground">{email}</span>
              </>
            ) : null}
            . Enter it below to finish activating your account.
          </p>

          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="otp"
                className="text-sm font-medium text-foreground"
              >
                Verification code
              </label>
              <InputOTP
                id="otp"
                name="otp"
                maxLength={6}
                value={otp}
                onChange={setOtp}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                containerClassName="justify-center"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            {success ? (
              <p
                aria-live="polite"
                className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
              >
                {success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || isResending}
              className="w-full rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Verifying..." : "Verify code"}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isSubmitting || isResending || resendCooldown > 0}
              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResending
                ? "Sending new code..."
                : resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Resend code"}
            </button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            Need a different email?{" "}
            <Link
              to="/auth/signup"
              search={{ redirect }}
              className="font-medium text-primary hover:underline"
            >
              Sign up again
            </Link>
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            Already verified?{" "}
            <Link
              to="/auth/signin"
              search={signInSearch}
              className="font-medium text-primary hover:underline"
            >
              Go to sign in
            </Link>
          </p>

          <p className="mt-3 text-xs text-muted-foreground">
            Don&apos;t see the code email? Check spam, then use resend. You can
            request a new code every 30 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
