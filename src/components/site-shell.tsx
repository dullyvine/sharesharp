import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./sharesharp.module.css";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.navbar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
          </span>
          <span className={styles.brandStack}>
            <span className={styles.brandName}>ShareSharp</span>
            <span className={styles.brandBy}>by divine</span>
          </span>
        </Link>
        <span className={styles.navPill}>
          <span className={styles.navPillDot} />
          Ops Active
        </span>
      </header>

      <main className={styles.stage}>
        {children}
      </main>

      <footer className={styles.siteFooter}>
        <p>All drops self-destruct &middot; No registration required &middot; Eyes only</p>
      </footer>
    </div>
  );
}
