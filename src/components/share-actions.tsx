"use client";

import { useState } from "react";
import styles from "./sharesharp.module.css";

type ShareActionsProps = {
  title: string;
  message: string | null;
  shareUrl: string;
};

export function ShareActions({ title, message, shareUrl }: ShareActionsProps) {
  const [status, setStatus] = useState("");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Link copied.");
    } catch {
      setStatus("Copy failed. Use the browser address bar instead.");
    }
  }

  async function handleShare() {
    if (!navigator.share) {
      await handleCopy();
      return;
    }

    try {
      await navigator.share({
        title,
        text: message || `Download ${title}`,
        url: shareUrl,
      });
      setStatus("");
    } catch {
      setStatus("");
    }
  }

  return (
    <div className={styles.shareActions}>
      <button type="button" className={styles.secondaryButton} onClick={handleCopy}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy link
      </button>
      <button type="button" className={styles.secondaryButton} onClick={handleShare}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Share
      </button>
      {status ? <p className={styles.actionFeedback}>{status}</p> : null}
    </div>
  );
}
