import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 text-xs text-slate-400">
        <p>CERT Ad Monitor (Internal Tool)</p>
        <nav className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-white">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/data-deletion" className="hover:text-white">
            Data Deletion
          </Link>
        </nav>
      </div>
    </footer>
  );
}
