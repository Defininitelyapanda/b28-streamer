import Link from "next/link";

export default function Footer() {
  return (
    <footer className="glass-bar mt-auto border-t border-white/10 px-[2.2%] py-8 max-md:px-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-lg font-black uppercase tracking-tighter">
            B28 <span className="text-accent">Entertainment</span>
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Kenyan films and originals. Stream on any device — premium experience when you subscribe.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <div>
            <p className="mb-2 font-semibold text-white">Watch</p>
            <ul className="space-y-1.5 text-muted">
              <li><Link href="/" className="hover:text-white">Home</Link></li>
              <li><Link href="/browse" className="hover:text-white">Browse</Link></li>
              <li><Link href="/search" className="hover:text-white">Search</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-semibold text-white">Account</p>
            <ul className="space-y-1.5 text-muted">
              <li><Link href="/login" className="hover:text-white">Log in</Link></li>
              <li><Link href="/offers" className="hover:text-white">Plans & pricing</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-semibold text-white">Support</p>
            <ul className="space-y-1.5 text-muted">
              <li><a href="mailto:support@b28.dev" className="hover:text-white">Contact</a></li>
              <li><span className="text-subtle">© {new Date().getFullYear()} B28</span></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
