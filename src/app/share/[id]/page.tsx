import Link from "next/link";
import { headers } from "next/headers";
import { SiteShell } from "@/components/site-shell";
import { ShareActions } from "@/components/share-actions";
import styles from "@/components/sharefast.module.css";
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
    <SiteShell
      panelTitle="Your file is ready"
      panelCaption="Share the link. It expires automatically."
    >
      {loadError ? (
        <div className={styles.shareCard}>
          <div className={styles.errorBanner} role="alert">
            {loadError}
          </div>
          <Link href="/" className={styles.ghostButton}>
            Send another file
          </Link>
        </div>
      ) : transfer ? (
        <div className={styles.shareCard}>
          <div className={styles.shareFileRow}>
            <div className={styles.shareFileMark}>SF</div>
            <div>
              <p className={styles.shareFileLabel}>Ready to download</p>
              <h3>{transfer.title}</h3>
              <p className={styles.shareFileName}>{transfer.originalFilename}</p>
            </div>
          </div>

          {transfer.message ? (
            <p className={styles.shareMessage}>{transfer.message}</p>
          ) : null}

          <dl className={styles.metaGrid}>
            <div>
              <dt>Size</dt>
              <dd>{formatBytes(transfer.fileSize)}</dd>
            </div>
            <div>
              <dt>Expires</dt>
              <dd>{formatDate(transfer.expiresAt)}</dd>
            </div>
            <div>
              <dt>Window</dt>
              <dd>
                {transfer.expiresInDays} day
                {transfer.expiresInDays === 1 ? "" : "s"}
              </dd>
            </div>
            <div>
              <dt>Downloads</dt>
              <dd>{transfer.downloadCount}</dd>
            </div>
          </dl>

          <div className={styles.actionRow}>
            <a className={styles.primaryButton} href={transfer.downloadUrl}>
              Download file
            </a>
            <ShareActions
              title={transfer.title}
              message={transfer.message}
              shareUrl={transfer.shareUrl}
            />
          </div>

          <div className={styles.shareFooter}>
            <Link href="/">Send another file</Link>
          </div>
        </div>
      ) : (
        <div className={styles.shareCard}>
          <p className={styles.emptyState}>
            This transfer is no longer available. It may have expired or was
            never completed.
          </p>
          <Link href="/" className={styles.ghostButton}>
            Send another file
          </Link>
        </div>
      )}
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
