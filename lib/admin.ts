import "server-only";

// Comma-separated allowlist, e.g. "owner@example.com,teammate@example.com".
// Edit via the ADMIN_EMAILS env var — no code change or redeploy of this
// file needed to add/remove an admin.
function adminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}
