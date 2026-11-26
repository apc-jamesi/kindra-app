import Link from "next/link";

export default function NoAccess({ what = "this record" }: { what?: string }) {
  return (
    <div className="card mx-auto max-w-xl text-center">
      <p className="text-3xl" aria-hidden>
        🔒
      </p>
      <h1 className="mt-2 text-xl font-bold">You don&apos;t have access to {what}</h1>
      <p className="mt-2 text-sm text-charcoal">
        Advisers can open only their own advisees&apos; records. If you should have access, ask the guidance office to
        check your Kindra role.
      </p>
      <Link href="/" className="btn-primary mt-4">
        Back to my advisees
      </Link>
    </div>
  );
}
