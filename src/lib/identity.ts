export const JUDGE_EMAIL_DOMAIN = "juri.mitweek.invalid";

const USERNAME_REGEX = /^[a-z0-9._-]{3,32}$/;

/**
 * Converts a judge username to an internal auth email.
 * Normalizes input by trimming and lowercasing.
 * Returns null if username does not match ^[a-z0-9._-]{3,32}$.
 */
export function usernameToEmail(username: string): string | null {
  const normalized = username.trim().toLowerCase();
  if (!USERNAME_REGEX.test(normalized)) {
    return null;
  }
  return `${normalized}@${JUDGE_EMAIL_DOMAIN}`;
}

/**
 * Converts a login identifier (email or judge username) to an internal auth email.
 * If input contains '@', it is treated as a direct email and lowercased.
 * Otherwise, it is converted via usernameToEmail.
 */
export function loginIdentifierToEmail(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  return usernameToEmail(trimmed);
}

/**
 * Formats an email for UI display.
 * If the email ends with the judge domain, returns only the username portion before '@'.
 * Otherwise returns the original email unchanged.
 */
export function emailToDisplayName(email: string): string {
  const suffix = `@${JUDGE_EMAIL_DOMAIN}`.toLowerCase();
  if (email.toLowerCase().endsWith(suffix)) {
    return email.slice(0, -suffix.length);
  }
  return email;
}
