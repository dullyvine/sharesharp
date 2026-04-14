"use client";

import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBytes } from "@/lib/formatting";
import {
  EXPIRY_OPTIONS,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/sharesharp-constants";
import styles from "./sharesharp.module.css";

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
    <form className={styles.uploadForm} onSubmit={handleSubmit}>
      {error ? (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        className={`${styles.dropzone} ${isDragging ? styles.isDragging : ""} ${selectedFile ? styles.hasFile : ""}`}
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

        {selectedFile ? (
          <div className={styles.filePreview}>
            <span className={styles.fileIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </span>
            <div className={styles.fileDetails}>
              <strong>{selectedFile.name}</strong>
              <span>{formatBytes(selectedFile.size)}</span>
            </div>
            <span className={styles.changeFile}>Swap</span>
          </div>
        ) : (
          <div className={styles.dropzoneEmpty}>
            <span className={styles.dropzoneIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </span>
            <p><strong>Attach Package</strong> — drop or click to select</p>
            <span className={styles.dropzoneLimit}>Max 5 GB per drop</span>
          </div>
        )}
      </button>

      <div className={styles.formFields}>
        <label className={styles.field}>
          <span>Package Label</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={96}
            placeholder="Describe the contents"
            required
          />
        </label>

        <label className={styles.field}>
          <span>Field Note <span className={styles.fieldOptional}>(optional)</span></span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={400}
            rows={3}
            placeholder="Instructions for the recipient"
          />
        </label>
      </div>

      <fieldset className={styles.expiryFieldset}>
        <legend>Burn Time</legend>
        <div className={styles.expiryOptions}>
          {EXPIRY_OPTIONS.map((option) => (
            <label key={option} className={`${styles.expiryOption} ${expiresInDays === option ? styles.expirySelected : ""}`}>
              <input
                type="radio"
                name="expiresInDays"
                checked={expiresInDays === option}
                onChange={() => setExpiresInDays(option)}
                className={styles.visuallyHidden}
              />
              <strong>{option} day{option === 1 ? "" : "s"}</strong>
            </label>
          ))}
        </div>
      </fieldset>

      {uploadState.active ? (
        <div className={styles.progressCard} aria-live="polite">
          <div className={styles.progressRow}>
            <span className={styles.progressLabel}>{uploadState.step}</span>
            <span className={styles.progressPct}>{Math.round(uploadState.progress * 100)}%</span>
          </div>
          <div className={styles.progressBar}>
            <span style={{ width: `${Math.round(uploadState.progress * 100)}%` }} />
          </div>
        </div>
      ) : null}

      <button
        className={styles.submitButton}
        type="submit"
        disabled={uploadState.active}
      >
        {uploadState.active ? "Deploying..." : (
          <>
            Initiate Drop
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </>
        )}
      </button>

      <p className={styles.formDisclaimer}>
        Package is permanently burned after the selected window.
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
