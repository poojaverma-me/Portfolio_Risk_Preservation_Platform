"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, Radio, FlaskConical, ScanSearch, BookOpenCheck } from "lucide-react";

const NAV = [
  { href: "/", label: "Command", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/feeds", label: "Feeds", icon: Radio },
  { href: "/stress", label: "Stress Lab", icon: FlaskConical },
  { href: "/trace", label: "Trace", icon: ScanSearch },
  { href: "/method", label: "How Jev decides", icon: BookOpenCheck },
];

export function Rail() {
  const path = usePathname();
  return (
    <nav className="row-span-2 flex flex-col items-center gap-1 border-r border-line bg-panel py-3">
      <Link href="/" className="mb-3 grid h-9 w-9 place-items-center" aria-label="Bastion home">
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden>
          <defs>
            <linearGradient id="bastion-g04" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d8e63c" />
              <stop offset="1" stopColor="#d6b4fc" />
            </linearGradient>
          </defs>
          <path d="M16 2 4 7v8c0 7.5 5.1 13.4 12 15 6.9-1.6 12-7.5 12-15V7L16 2Z" fill="none" stroke="url(#bastion-g04)" strokeWidth="2" />
          <path d="M10 13h3v-2h2v2h2v-2h2v2h3v8H10z" fill="url(#bastion-g04)" />
        </svg>
      </Link>
      {NAV.map(({ href, label, icon: Icon }) => {
        const on = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={`group relative grid h-10 w-10 place-items-center rounded-lg transition ${on ? "bg-raise text-accent" : "text-mute hover:bg-raise hover:text-ink"}`}
          >
            <Icon size={18} strokeWidth={1.8} />
            {on && <span className="absolute -left-[10px] h-5 w-[3px] rounded-r bg-accent" />}
            <span className="pointer-events-none absolute left-12 z-50 whitespace-nowrap rounded-md border border-line2 bg-raise px-2 py-1 text-[11.5px] text-ink opacity-0 shadow-xl transition group-hover:opacity-100">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
