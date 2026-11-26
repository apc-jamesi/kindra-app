import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { userIdForEmail } from "@/lib/userDirectory";

/**
 * Microsoft Entra ID sign-in (Auth.js). Settings in .env:
 *   ENTRA_TENANT_ID      Directory (tenant) ID
 *   ENTRA_CLIENT_ID      Application (client) ID
 *   ENTRA_CLIENT_SECRET  Client secret value
 *   AUTH_SECRET          random string that signs the session cookie
 * Redirect URI registered in Entra: <site>/api/auth/callback/microsoft-entra-id
 */
const tenantId = process.env.ENTRA_TENANT_ID?.trim();

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.ENTRA_CLIENT_ID?.trim(),
      clientSecret: process.env.ENTRA_CLIENT_SECRET?.trim(),
      // Must match Microsoft's published issuer exactly (no trailing slash), so it is built here rather than typed in .env.
      issuer: tenantId ? `https://login.microsoftonline.com/${tenantId}/v2.0` : undefined,
      // Replaces the default profile handler, which also downloads the profile photo into the session cookie.
      profile: (p) => ({ id: p.sub, name: p.name, email: (p.email || p.preferred_username || "").toLowerCase() }),
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/signin", error: "/signin" },
  trustHost: true,
  callbacks: {
    // Only people listed in KINDRA_USER_EMAILS may sign in.
    signIn: ({ user }) => Boolean(userIdForEmail(user.email)),
  },
});
