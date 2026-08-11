"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authErrorMessage } from "@/lib/auth-utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { error: authError } = await createSupabaseBrowserClient().auth.updateUser({ password });
      if (authError) throw authError;
      router.replace("/feed");
      router.refresh();
    } catch (authError) {
      setError(authErrorMessage(authError, "update-password"));
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Link href="/" className="auth-back">Back to AI War</Link>
        <div>
          <span className="hero-kicker"><i /> Secure recovery</span>
          <h1>Reset access.<br /><em>Keep your signal.</em></h1>
          <p>Choose a new password for your private AI War intelligence feed.</p>
        </div>
        <span className="auth-secure"><LockKeyhole size={13} /> Verified recovery session</span>
      </section>

      <section className="auth-form-panel">
        <form className="auth-form" onSubmit={submit}>
          <img src="/assets/aiwar-logo-mark.png" alt="AI War" />
          <div>
            <span className="landing-eyebrow">New password</span>
            <h2>Secure your account</h2>
            <p className="auth-form-description">Updating password for {email}</p>
          </div>

          <label>
            <span>New password</span>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <label>
            <span>Confirm new password</span>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="Enter the password again"
            />
          </label>

          {error ? <p className="auth-message error" role="alert">{error}</p> : null}

          <button className="auth-submit" type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update password"}
            {!isLoading ? <ArrowRight size={16} /> : null}
          </button>
        </form>
      </section>
    </main>
  );
}
