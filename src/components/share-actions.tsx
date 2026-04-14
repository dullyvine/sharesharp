"use client";

import { useState } from "react";
import styles from "./sharefast.module.css";

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
    <div className={styles.secondaryActions}>
      <button type="button" className={styles.ghostButton} onClick={handleCopy}>
        Copy link
      </button>
      <button type="button" className={styles.textButton} onClick={handleShare}>
        Share from device
      </button>
      {status ? <p className={styles.actionStatus}>{status}</p> : null}
    </div>
  );
}
