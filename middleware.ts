import { NextResponse } from "next/server";
import { auth } from "@/auth";

/** Every page and API route requires a Microsoft Entra sign-in, except the sign-in flow itself. */
export default auth((req) => {
  if (req.auth?.user) return;
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const url = new URL("/signin", req.nextUrl.origin);
  url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
});

export const config = {
  // /api/alerts/escalate checks its own access (signed-in user or CRON_SECRET) so a scheduler can call it.
  matcher: ["/((?!api/auth|api/alerts/escalate|signin|_next/static|_next/image|favicon.ico|apc-seal.png).*)"],
};
