"use client";

import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { authErrorMessage, safeNextPath } from "@/lib/auth-utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = useMemo(() => {
    const value = searchParams.get("error");
    if (value === "confirmation_failed" || value === "reset_link_invalid") {
      return "That email link is invalid or has expired. Request a new email below.";
    }
    if (value === "session_expired") return "Your session expired. Sign in again to continue.";
    return "";
  }, [searchParams]);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError);
  const nextPath = useMemo(() => {
    return safeNextPath(searchParams.get("next"));
  }, [searchParams]);

  function confirmationCallbackUrl() {
    return `${window.location.origin}/auth/callback`;
  }

  function recoveryCallbackUrl() {
    return `${window.location.origin}/auth/recovery`;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "signin") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) {
          if (authError.code === "email_not_confirmed" || /email not confirmed/i.test(authError.message)) setCanResend(true);
          throw authError;
        }
        router.replace(nextPath);
        router.refresh();
        return;
      }

      if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: recoveryCallbackUrl(),
        });
        if (authError) throw authError;
        setMessage("Password reset email sent. Open the link in that email to continue.");
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: confirmationCallbackUrl() },
      });
      if (authError) throw authError;
      if (data.session) {
        router.replace(nextPath);
        router.refresh();
      } else {
        setMessage("Account created. Check your email to confirm, then sign in.");
        setCanResend(true);
        setMode("signin");
      }
    } catch (authError) {
      const action = mode === "signin" ? "sign-in" : mode === "signup" ? "sign-up" : "reset";
      setError(authErrorMessage(authError, action));
    } finally {
      setIsLoading(false);
    }
  }

  async function resendConfirmation() {
    if (!email.trim() || isResending) return;
    setIsResending(true);
    setError("");
    setMessage("");

    try {
      const { error: authError } = await createSupabaseBrowserClient().auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: confirmationCallbackUrl() },
      });
      if (authError) throw authError;
      setMessage("A new confirmation email has been sent.");
    } catch (authError) {
      setError(authErrorMessage(authError, "resend"));
    } finally {
      setIsResending(false);
    }
  }

  function changeMode(nextMode: "signin" | "signup" | "forgot") {
    setMode(nextMode);
    setError("");
    setMessage("");
    setCanResend(false);
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Link href="/" className="auth-back"><ArrowLeft size={14} /> Back to AI War</Link>
        <div>
          <span className="hero-kicker"><i /> Member intelligence</span>
          <h1>Signal starts<br /><em>on the inside.</em></h1>
          <p>Sign in to access the live frontier AI feed, filters, topics, and primary-source links.</p>
        </div>
        <span className="auth-secure"><LockKeyhole size={13} /> Secured by Supabase Auth</span>
      </section>

      <section className="auth-form-panel">
        <form className="auth-form" onSubmit={submit}>
          <img src="/assets/aiwar-logo-mark.png" alt="AI War" />
          <div>
            <span className="landing-eyebrow">
              {mode === "signin" ? "Welcome back" : mode === "signup" ? "New member" : "Account recovery"}
            </span>
            <h2>
              {mode === "signin"
                ? "Enter the intelligence feed"
                : mode === "signup"
                  ? "Create your AI War account"
                  : "Reset your password"}
            </h2>
          </div>

          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="you@company.com" />
          </label>
          {mode !== "forgot" ? (
            <label>
              <span className="auth-label-row">
                Password
                {mode === "signin" ? (
                  <button type="button" onClick={() => changeMode("forgot")}>Forgot password?</button>
                ) : null}
              </span>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          ) : null}

          {error ? <p className="auth-message error" role="alert">{error}</p> : null}
          {message ? <p className="auth-message success" role="status">{message}</p> : null}
          {canResend ? (
            <button className="auth-inline-action" type="button" onClick={resendConfirmation} disabled={isResending}>
              {isResending ? "Sending..." : "Resend confirmation email"}
            </button>
          ) : null}

          <button className="auth-submit" type="submit" disabled={isLoading}>
            {isLoading
              ? "Please wait..."
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset email"}
            {!isLoading ? <ArrowRight size={16} /> : null}
          </button>

          <p className="auth-switch">
            {mode === "signin" ? "No account yet?" : mode === "signup" ? "Already have an account?" : "Remembered your password?"}{" "}
            <button type="button" onClick={() => changeMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}
