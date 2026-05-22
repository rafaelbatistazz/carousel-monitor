import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/conteudos", label: "Conteúdos" },
  { href: "/scripts", label: "Roteiros" },
];

export function Sidebar() {
  return (
    <aside className="w-full border-b border-slate-200 bg-white px-4 py-4 md:h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Carousel Monitor</p>
        <h1 className="text-xl font-semibold text-slate-900">Painel</h1>
      </div>
      <nav className="flex gap-2 md:flex-col">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
