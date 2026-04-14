import Link from "next/link";
import { headers } from "next/headers";
import { SiteShell } from "@/components/site-shell";
import { ShareActions } from "@/components/share-actions";
import styles from "@/components/sharesharp.module.css";
import { formatBytes, formatDate } from "@/lib/formatting";
import { getTransferDetails } from "@/lib/transfers";

export const dynamic = "force-dynamic";

type SharePageProps = {
  params: Promise<{ id: string }>;
};

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;
  const origin = await getRequestOrigin();
  let transfer = null;
  let loadError = "";

  try {
    transfer = await getTransferDetails(id, origin);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unable to load this transfer.";
  }

  return (
    <SiteShell>
      <div className={styles.centeredCard}>
        {loadError ? (
          <>
            <div className={styles.errorBanner} role="alert">
              {loadError}
            </div>
            <Link href="/" className={styles.submitButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Initiate New Drop
            </Link>
          </>
        ) : transfer ? (
          <>
            <div className={styles.downloadHeader}>
              <span className={styles.downloadIcon}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </span>
              <div>
                <h1 className={styles.downloadTitle}>{transfer.title}</h1>
                <p className={styles.downloadFilename}>{transfer.originalFilename}</p>
              </div>
            </div>

            {transfer.message ? (
              <div className={styles.downloadMessage}>
                <p>{transfer.message}</p>
              </div>
            ) : null}

            <div className={styles.downloadMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Size</span>
                <span className={styles.metaValue}>{formatBytes(transfer.fileSize)}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Expires</span>
                <span className={styles.metaValue}>{formatDate(transfer.expiresAt)}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Window</span>
                <span className={styles.metaValue}>{transfer.expiresInDays} day{transfer.expiresInDays === 1 ? "" : "s"}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Downloads</span>
                <span className={styles.metaValue}>{transfer.downloadCount}</span>
              </div>
            </div>

            <a className={styles.submitButton} href={transfer.downloadUrl}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Retrieve Package
            </a>

            <ShareActions
              title={transfer.title}
              message={transfer.message}
              shareUrl={transfer.shareUrl}
            />

            <div className={styles.cardFooterLink}>
              <Link href="/">Initiate another drop</Link>
            </div>
          </>
        ) : (
          <>
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </span>
              <h2>Drop Burned</h2>
              <p>This link has expired or was never completed. The package auto-destructed.</p>
            </div>
            <Link href="/" className={styles.submitButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Initiate New Drop
            </Link>
          </>
        )}
      </div>
    </SiteShell>
  );
}

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}
