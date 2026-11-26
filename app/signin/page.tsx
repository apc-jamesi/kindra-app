import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { signedInUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  AccessDenied:
    "Your Microsoft account isn't set up for Kindra. Ask the guidance office to add your APC email, then sign in again.",
  Configuration: "Microsoft sign-in isn't configured correctly on this server. Check ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET and AUTH_SECRET in .env.",
};

/** Only allow redirects back into Kindra itself. */
const safePath = (p?: string) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/");

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  const { error, callbackUrl } = await searchParams;
  if (!error && (await signedInUser())) redirect(safePath(callbackUrl));

  return (
    <div className="mx-auto max-w-md space-y-6 py-12">
      <div className="card space-y-5 border-t-4 border-t-brand p-8">
        <div>
          <h1 className="text-2xl font-bold">Sign in to Kindra</h1>
          <p className="mt-1 text-sm text-charcoal">Use your APC Microsoft account.</p>
        </div>
        {error && (
          <p role="alert" className="rounded-md bg-late-bg p-3 text-sm text-late-text">
            {ERRORS[error] ?? "Sign-in didn't complete. Please try again."}
          </p>
        )}
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: safePath(callbackUrl) });
          }}
        >
          <button type="submit" className="btn-primary w-full">
            Sign in with Microsoft
          </button>
        </form>
      </div>
    </div>
  );
}
