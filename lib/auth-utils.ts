export type AuthAction = "sign-in" | "sign-up" | "reset" | "resend" | "update-password";

export function safeNextPath(value: string | null | undefined, fallback = "/feed") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }

  try {
    const base = new URL("https://aiwar.local");
    const resolved = new URL(value, base);
    if (resolved.origin !== base.origin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

export function authErrorMessage(error: unknown, action: AuthAction) {
  const authError = error as { code?: string; message?: string } | null;
  const code = authError?.code?.toLowerCase() || "";
  const message = authError?.message?.toLowerCase() || "";

  if (code.includes("invalid_credentials") || message.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (code.includes("email_not_confirmed") || message.includes("email not confirmed")) {
    return "Confirm your email before signing in. You can request a new confirmation email below.";
  }
  if (code.includes("user_already_exists") || message.includes("already registered")) {
    return "An account already exists for this email. Sign in or reset your password.";
  }
  if (code.includes("weak_password") || message.includes("password should")) {
    return "Use a password with at least 6 characters.";
  }
  if (code.includes("same_password") || message.includes("different from the old password")) {
    return "Choose a password that is different from your current password.";
  }
  if (code.includes("rate_limit") || message.includes("rate limit") || message.includes("too many requests")) {
    return "Too many attempts. Wait a few minutes, then try again.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "AI War cannot reach the authentication service. Check your connection and try again.";
  }

  const fallback: Record<AuthAction, string> = {
    "sign-in": "Could not sign in. Please try again.",
    "sign-up": "Could not create the account. Please try again.",
    reset: "Could not send the password reset email. Please try again.",
    resend: "Could not resend the confirmation email. Please try again.",
    "update-password": "Could not update your password. Please try again.",
  };

  return fallback[action];
}

export function loginPathForCurrentPage() {
  if (typeof window === "undefined") return "/login";
  const next = `${window.location.pathname}${window.location.search}`;
  return `/login?error=session_expired&next=${encodeURIComponent(next)}`;
}
