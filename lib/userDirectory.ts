/**
 * Maps Microsoft Entra sign-in emails to Kindra users (roles and advisee assignments live on the Kindra user).
 * Set in .env, comma-separated, one or more emails per Kindra user id:
 *   KINDRA_USER_EMAILS=adviser-a=ana.reyes@apc.edu.ph,counselor=liza.cruz@apc.edu.ph
 * Anyone not listed is refused at sign-in. Kept free of server-only imports so middleware can use it.
 */
let cache: { raw: string; map: Map<string, string> } | null = null;

function directory(): Map<string, string> {
  const raw = process.env.KINDRA_USER_EMAILS ?? "";
  if (cache?.raw === raw) return cache.map;
  const map = new Map<string, string>();
  for (const pair of raw.split(",")) {
    const [id, email] = pair.split("=").map((s) => s?.trim());
    if (id && email) map.set(email.toLowerCase(), id);
  }
  cache = { raw, map };
  return map;
}

export function userIdForEmail(email: string | null | undefined): string | null {
  return email ? directory().get(email.trim().toLowerCase()) ?? null : null;
}
