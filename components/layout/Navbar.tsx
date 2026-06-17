import Link from "next/link";
import { SITE } from "@/content/site";

/** TODO: real nav, sticky behavior, mobile trigger — design phase. */
export default function Navbar() {
  return (
    <header className="border-b border-navy/10">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-bold text-navy">{SITE.name}</Link>
        <div className="hidden gap-6 sm:flex text-sm text-navy/70">
          <Link href="/services/weekly-pool-service">Services</Link>
          <Link href="/about">About</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </nav>
    </header>
  );
}
