import Link from "next/link";
import { TasteCount } from "./TasteCount";

const NAV = [
  { href: "/", label: "Museum" },
  { href: "/pairs", label: "Pairs" },
  { href: "/epochs", label: "Epochs", wide: true },
  { href: "/artists", label: "Artists", wide: true },
  { href: "/collection", label: "Collection", wide: true },
];

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-30 bg-bg/80 backdrop-blur-md">
      <div className="flex h-[var(--header-h)] items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-serif text-[17px] leading-none tracking-wide">Pendant</span>
          <span className="label hidden text-faint md:inline">A museum of taste</span>
        </Link>
        <nav className="label flex items-center gap-5 text-muted md:gap-7">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`transition-colors hover:text-fg ${n.wide ? "hidden sm:inline" : ""}`}>
              {n.label}
            </Link>
          ))}
          <Link href="/taste" className="flex items-center gap-1.5 transition-colors hover:text-fg">
            Your taste
            <TasteCount />
          </Link>
        </nav>
      </div>
    </header>
  );
}
