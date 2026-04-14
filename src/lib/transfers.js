import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  EXPIRY_OPTIONS,
  MAX_FILE_SIZE_BYTES,
  PART_SIZE_BYTES,
} from "@/lib/sharefast-constants";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TITLE_LENGTH = 96;
const MAX_MESSAGE_LENGTH = 400;
const ALLOWED_EXPIRY_DAYS = new Set(EXPIRY_OPTIONS);
const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function toErrorResponse(error) {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return Response.json({ error: "Unexpected server error." }, { status: 500 });
}

export async function createTransferSession(payload, origin) {
  const title = normalizeRequiredText(payload?.title, MAX_TITLE_LENGTH, "Add a title.");
  const message = normalizeOptionalText(payload?.message, MAX_MESSAGE_LENGTH);
  const fileName = normalizeRequiredText(payload?.fileName, 180, "Select a file.");
  const fileSize = toPositiveInteger(payload?.fileSize, "File size is required.");
  const expiresInDays = toPositiveInteger(
    payload?.expiresInDays,
    "Select an expiry window.",
  );

  if (!ALLOWED_EXPIRY_DAYS.has(expiresInDays)) {
    throw new HttpError(400, "Expiry must be 1 day or 3 days.");
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    throw new HttpError(400, "Files larger than 5 GB are not enabled in this build.");
  }

  const contentType =
    typeof payload?.contentType === "string" && payload.contentType.trim().length
      ? payload.contentType.trim().slice(0, 120)
      : "application/octet-stream";

  const env = getCloudflareContext().env;
  const id = createTransferId();
  const createdAt = Date.now();
  const expiresAt = createdAt + expiresInDays * DAY_MS;
  const storageFilename = sanitizeForStorage(fileName);
  const objectKey = `${id}/${storageFilename}`;
  const multipartUpload = await env.UPLOADS.createMultipartUpload(objectKey);

  try {
    await env.DB.prepare(
      `
        INSERT INTO transfers (
          id,
          status,
          object_key,
          upload_id,
          title,
          message,
          original_filename,
          storage_filename,
          content_type,
          file_size,
          expires_in_days,
          created_at,
          expires_at
        ) VALUES (?, 'uploading', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
      .bind(
        id,
        objectKey,
        multipartUpload.uploadId,
        title,
        message,
        fileName,
        storageFilename,
        contentType,
        fileSize,
        expiresInDays,
        createdAt,
        expiresAt,
      )
      .run();
  } catch (error) {
    await multipartUpload.abort().catch(() => undefined);
    throw error;
  }

  return {
    transferId: id,
    uploadId: multipartUpload.uploadId,
    partSize: PART_SIZE_BYTES,
    expiresAt,
    shareUrl: new URL(`/share/${id}`, origin).toString(),
    downloadUrl: new URL(`/api/transfers/${id}/download`, origin).toString(),
  };
}

export async function uploadTransferPart(transferId, uploadId, partNumber, chunk) {
  const transfer = await getTransferRecord(transferId);
  if (!transfer) {
    throw new HttpError(404, "Transfer not found.");
  }

  assertTransferIsActive(transfer);

  if (transfer.status !== "uploading") {
    throw new HttpError(409, "Upload has already been completed.");
  }

  if (transfer.uploadId !== uploadId) {
    throw new HttpError(409, "Upload session does not match this transfer.");
  }

  if (!Number.isInteger(partNumber) || partNumber < 1) {
    throw new HttpError(400, "Part number is invalid.");
  }

  const env = getCloudflareContext().env;
  const multipartUpload = env.UPLOADS.resumeMultipartUpload(
    transfer.objectKey,
    uploadId,
  );
  const uploadedPart = await multipartUpload.uploadPart(partNumber, chunk);

  return {
    etag: uploadedPart.etag,
    partNumber: uploadedPart.partNumber,
  };
}

export async function completeTransferUpload(transferId, uploadId, parts, origin) {
  const transfer = await getTransferRecord(transferId);
  if (!transfer) {
    throw new HttpError(404, "Transfer not found.");
  }

  assertTransferIsActive(transfer);

  if (transfer.status !== "uploading") {
    throw new HttpError(409, "Transfer is no longer accepting parts.");
  }

  if (transfer.uploadId !== uploadId) {
    throw new HttpError(409, "Upload session does not match this transfer.");
  }

  const normalizedParts = normalizeUploadedParts(parts);
  const env = getCloudflareContext().env;
  const multipartUpload = env.UPLOADS.resumeMultipartUpload(
    transfer.objectKey,
    uploadId,
  );
  await multipartUpload.complete(normalizedParts);

  await env.DB.prepare(
    `
      UPDATE transfers
      SET status = 'ready',
          upload_id = NULL,
          completed_at = ?
      WHERE id = ?
    `,
  )
    .bind(Date.now(), transferId)
    .run();

  return {
    transferId,
    expiresAt: transfer.expiresAt,
    shareUrl: new URL(`/share/${transferId}`, origin).toString(),
    downloadUrl: new URL(`/api/transfers/${transferId}/download`, origin).toString(),
  };
}

export async function abortTransferUpload(transferId, uploadId) {
  const transfer = await getTransferRecord(transferId);
  if (!transfer) {
    return;
  }

  const env = getCloudflareContext().env;

  if (transfer.status === "uploading" && transfer.uploadId === uploadId) {
    const multipartUpload = env.UPLOADS.resumeMultipartUpload(
      transfer.objectKey,
      uploadId,
    );
    await multipartUpload.abort().catch(() => undefined);
  }

  await env.UPLOADS.delete(transfer.objectKey).catch(() => undefined);
  await env.DB.prepare("DELETE FROM transfers WHERE id = ?").bind(transferId).run();
}

export async function getTransferDetails(transferId, origin) {
  const transfer = await getTransferRecord(transferId);
  if (!transfer || transfer.status !== "ready") {
    return null;
  }

  assertTransferIsActive(transfer);

  return toTransferPayload(transfer, origin);
}

export async function getDownloadResponse(transferId, origin, options = {}) {
  const { headOnly = false } = options;
  const transfer = await getTransferRecord(transferId);
  if (!transfer || transfer.status !== "ready") {
    throw new HttpError(404, "Transfer not found.");
  }

  assertTransferIsActive(transfer);

  const env = getCloudflareContext().env;
  const object = await env.UPLOADS.get(transfer.objectKey);
  if (!object) {
    throw new HttpError(404, "File payload is missing.");
  }

  if (!headOnly) {
    await env.DB.prepare(
      `
        UPDATE transfers
        SET download_count = download_count + 1
        WHERE id = ?
      `,
    )
      .bind(transferId)
      .run();
  }

  const headers = new Headers();
  headers.set("Content-Type", transfer.contentType || "application/octet-stream");
  headers.set("Content-Length", object.size.toString());
  headers.set("Content-Disposition", buildContentDisposition(transfer.originalFilename));
  headers.set("Cache-Control", "private, max-age=0, no-store");
  headers.set("ETag", object.httpEtag);

  return new Response(headOnly ? null : object.body, {
    status: 200,
    headers,
  });
}

export async function getTransferRecord(transferId) {
  const env = getCloudflareContext().env;
  return (
    (await env.DB.prepare(
      `
        SELECT
          id,
          status,
          object_key AS objectKey,
          upload_id AS uploadId,
          title,
          message,
          original_filename AS originalFilename,
          storage_filename AS storageFilename,
          content_type AS contentType,
          file_size AS fileSize,
          expires_in_days AS expiresInDays,
          created_at AS createdAt,
          expires_at AS expiresAt,
          completed_at AS completedAt,
          download_count AS downloadCount
        FROM transfers
        WHERE id = ?
        LIMIT 1
      `,
    )
      .bind(transferId)
      .first()) ?? null
  );
}

function toTransferPayload(transfer, origin) {
  return {
    id: transfer.id,
    title: transfer.title,
    message: transfer.message,
    originalFilename: transfer.originalFilename,
    contentType: transfer.contentType,
    fileSize: transfer.fileSize,
    expiresInDays: transfer.expiresInDays,
    createdAt: transfer.createdAt,
    expiresAt: transfer.expiresAt,
    completedAt: transfer.completedAt,
    downloadCount: transfer.downloadCount,
    shareUrl: new URL(`/share/${transfer.id}`, origin).toString(),
    downloadUrl: new URL(`/api/transfers/${transfer.id}/download`, origin).toString(),
  };
}

function assertTransferIsActive(transfer) {
  if (transfer.expiresAt <= Date.now()) {
    throw new HttpError(410, "This transfer has expired.");
  }
}

function normalizeRequiredText(value, limit, message) {
  if (typeof value !== "string") {
    throw new HttpError(400, message);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new HttpError(400, message);
  }

  return normalized.slice(0, limit);
}

function normalizeOptionalText(value, limit) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized.slice(0, limit) : null;
}

function toPositiveInteger(value, message) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new HttpError(400, message);
  }

  return value;
}

function normalizeUploadedParts(parts) {
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new HttpError(400, "Uploaded parts are required.");
  }

  const normalized = parts.map((part) => {
    if (
      !part ||
      typeof part.etag !== "string" ||
      !part.etag.length ||
      typeof part.partNumber !== "number" ||
      !Number.isInteger(part.partNumber) ||
      part.partNumber < 1
    ) {
      throw new HttpError(400, "Uploaded parts are malformed.");
    }

    return {
      etag: part.etag,
      partNumber: part.partNumber,
    };
  });

  normalized.sort((left, right) => left.partNumber - right.partNumber);
  return normalized;
}

function sanitizeForStorage(fileName) {
  const withoutPath = fileName.split(/[\\/]/).pop() ?? "file";
  const ascii = withoutPath.replace(/[^A-Za-z0-9._ -]/g, "-");
  const collapsed = ascii.replace(/\s+/g, " ").trim();
  const safe = collapsed.replace(/-+/g, "-");
  return safe || `file-${Date.now()}`;
}

function createTransferId(length = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join(
    "",
  );
}

function buildContentDisposition(fileName) {
  const fallback =
    fileName.replace(/[^\x20-\x7E]+/g, "").replace(/["\\]/g, "").trim() || "download";
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
