import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./sharefast.module.css";

type SiteShellProps = {
  panelTitle: string;
  panelCaption: string;
  children: ReactNode;
};

export function SiteShell({
  panelTitle,
  panelCaption,
  children,
}: SiteShellProps) {
  return (
    <div className={styles.pageShell}>
      <div className={`${styles.backgroundWash} ${styles.backgroundWashLeft}`} />
      <div className={`${styles.backgroundWash} ${styles.backgroundWashRight}`} />
      <div className={styles.gridOverlay} />

      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>SF</span>
          <span className={styles.brandText}>
            <strong>ShareFast</strong>
            <small>Send files, not follow-ups.</small>
          </span>
        </Link>

        <div className={styles.topbarMeta}>
          <span>Auto-expiring</span>
          <span>No account needed</span>
          <span>Up to 5 GB</span>
        </div>
      </header>

      <main className={styles.layout}>
        <section className={styles.heroPanel}>
          <p className={styles.eyebrow}>Temporary file sharing</p>
          <h1>Send any file with a link that self-destructs.</h1>
          <p className={styles.heroCopy}>
            Upload your file, add a quick note, pick an expiry window, and
            share the link. When the timer runs out, it&apos;s gone for good.
            No signups. No storage bloat. Just the handoff.
          </p>

          <div className={styles.heroBadges}>
            <span>Files up to 5 GB</span>
            <span>Auto-delete on expiry</span>
            <span>Zero accounts</span>
          </div>

          <div className={styles.heroCard}>
            <div className={styles.heroCardRow}>
              <strong>01</strong>
              <p>Drop your file and add a title or message for the recipient.</p>
            </div>
            <div className={styles.heroCardRow}>
              <strong>02</strong>
              <p>Choose 1 or 3 days — the link stops working after your window.</p>
            </div>
            <div className={styles.heroCardRow}>
              <strong>03</strong>
              <p>Share the link. Once expired, the file is permanently removed.</p>
            </div>
          </div>
        </section>

        <section className={styles.appPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelKicker}>Transfer</p>
              <h2>{panelTitle}</h2>
            </div>
            <p className={styles.panelCaption}>{panelCaption}</p>
          </div>

          {children}
        </section>
      </main>
    </div>
  );
}
