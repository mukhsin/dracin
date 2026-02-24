import { X } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function SignInModal({
  isOpen,
  onClose,
  message = "Please sign in to use this feature",
}: SignInModalProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const signInSearch = { redirect: currentPath };
  const signInState = { redirect: currentPath };
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md bg-[#0A0A0A] border border-primary/30 rounded-lg shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pt-12">
          <div
            className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10"
            aria-hidden="true"
          >
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <h3
            id="signin-modal-title"
            className="mb-2 text-xl font-semibold text-center text-white"
          >
            Sign In Required
          </h3>
          <p className="mb-6 text-center text-gray-400">{message}</p>

          <div className="flex flex-col gap-3">
            <Link
              to="/auth/signin"
              search={signInSearch}
              state={signInState}
              onClick={onClose}
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium tracking-wider uppercase text-white bg-primary hover:bg-primary/80 transition-all rounded-sm"
            >
              Sign In
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium tracking-wider uppercase text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 transition-all rounded-sm"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignInModal;
