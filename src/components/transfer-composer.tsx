"use client";

import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBytes } from "@/lib/formatting";
import {
  EXPIRY_OPTIONS,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/sharefast-constants";
import styles from "./sharefast.module.css";

type UploadState = {
  active: boolean;
  progress: number;
  step: string;
};

type InitTransferResponse = {
  transferId: string;
  uploadId: string;
  partSize: number;
  expiresAt: number;
};

type UploadPartResponse = {
  etag: string;
  partNumber: number;
};

const defaultUploadState: UploadState = {
  active: false,
  progress: 0,
  step: "Waiting to start",
};

export function TransferComposer() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>(defaultUploadState);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Choose a file before creating the transfer.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError("File size limit is 5 GB per transfer.");
      return;
    }

    let initResponse: InitTransferResponse | null = null;

    try {
      setError("");
      setUploadState({
        active: true,
        progress: 0,
        step: "Creating upload session...",
      });

      initResponse = await fetchJson<InitTransferResponse>("/api/transfers/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          expiresInDays,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          contentType: selectedFile.type || "application/octet-stream",
        }),
      });

      const parts: UploadPartResponse[] = [];
      const totalParts = Math.max(
        1,
        Math.ceil(selectedFile.size / initResponse.partSize),
      );

      for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
        const start = (partNumber - 1) * initResponse.partSize;
        const end = Math.min(start + initResponse.partSize, selectedFile.size);

        setUploadState({
          active: true,
          progress: (partNumber - 1) / totalParts,
          step: `Uploading chunk ${partNumber} of ${totalParts}...`,
        });

        const uploadedPart = await fetchJson<UploadPartResponse>(
          `/api/transfers/${initResponse.transferId}/parts/${partNumber}?uploadId=${encodeURIComponent(initResponse.uploadId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream" },
            body: selectedFile.slice(start, end),
          },
        );

        parts.push(uploadedPart);
      }

      setUploadState({
        active: true,
        progress: 0.98,
        step: "Finalizing share link...",
      });

      await fetchJson(`/api/transfers/${initResponse.transferId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: initResponse.uploadId,
          parts,
        }),
      });

      setSelectedFile(null);
      setTitle("");
      setMessage("");
      setExpiresInDays(1);
      setUploadState({
        active: false,
        progress: 1,
        step: "Upload complete.",
      });

      const completedTransferId = initResponse.transferId;
      startTransition(() => {
        router.push(`/share/${completedTransferId}`);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Upload failed.",
      );
      setUploadState(defaultUploadState);

      if (initResponse?.transferId && initResponse?.uploadId) {
        await fetch(
          `/api/transfers/${initResponse.transferId}/abort?uploadId=${encodeURIComponent(initResponse.uploadId)}`,
          { method: "POST" },
        ).catch(() => undefined);
      }
    }
  }

  return (
    <form className={styles.transferForm} onSubmit={handleSubmit}>
      {error ? (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        className={`${styles.dropzone} ${isDragging ? styles.isDragging : ""}`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const [file] = Array.from(event.dataTransfer.files);
          if (file) {
            setSelectedFile(file);
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className={styles.visuallyHidden}
          onChange={(event) => {
            const [file] = Array.from(event.target.files ?? []);
            setSelectedFile(file ?? null);
          }}
        />

        <div className={styles.dropzoneCopy}>
          <span className={styles.dropzoneIcon}>+</span>
          <div>
            <strong>{selectedFile ? selectedFile.name : "Choose a file"}</strong>
            <p>
              {selectedFile
                ? `${formatBytes(selectedFile.size)} ready to upload`
                : "Drop a file here or browse from your device."}
            </p>
          </div>
        </div>

        <span className={styles.dropzoneMeta}>Up to 5 GB</span>
      </button>

      <label className={styles.field}>
        <span>Title</span>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={96}
          placeholder="e.g. Campaign deck, raw footage, contract..."
          required
        />
      </label>

      <label className={styles.field}>
        <span>Message</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={400}
          rows={4}
          placeholder="Optional note for the recipient"
        />
      </label>

      <fieldset className={styles.expiryFieldset}>
        <legend>Expiry</legend>
        {EXPIRY_OPTIONS.map((option) => (
          <label key={option} className={styles.expiryOption}>
            <input
              type="radio"
              name="expiresInDays"
              checked={expiresInDays === option}
              onChange={() => setExpiresInDays(option)}
            />
            <span>
              <strong>{option} day{option === 1 ? "" : "s"}</strong>
              <small>{option === 1 ? "Quick handoff" : "Maximum window"}</small>
            </span>
          </label>
        ))}
      </fieldset>

      {uploadState.active ? (
        <div className={styles.progressCard} aria-live="polite">
          <div className={styles.progressRow}>
            <strong>{uploadState.step}</strong>
            <span>{Math.round(uploadState.progress * 100)}%</span>
          </div>
          <div className={styles.progressBar}>
            <span style={{ width: `${Math.round(uploadState.progress * 100)}%` }} />
          </div>
        </div>
      ) : null}

      <button
        className={styles.primaryButton}
        type="submit"
        disabled={uploadState.active}
      >
        {uploadState.active ? "Uploading..." : "Generate share link"}
      </button>

      <p className={styles.formNote}>
        Files are permanently deleted after your chosen window. Max {formatBytes(MAX_FILE_SIZE_BYTES)} per transfer.
      </p>
    </form>
  );
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string" ? payload.error : "Request failed.",
    );
  }

  return payload as T;
}
