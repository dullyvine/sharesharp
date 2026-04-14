const CLEANUP_BATCH_SIZE = 50;

async function getOpenNextHandler() {
  const workerModule = await import("./.open-next/worker.js");
  return workerModule.default;
}

async function cleanupExpiredTransfers(env) {
  const result = await env.DB.prepare(
    `
      SELECT
        id,
        status,
        object_key AS objectKey,
        upload_id AS uploadId
      FROM transfers
      WHERE expires_at <= ?
      LIMIT ?
    `,
  )
    .bind(Date.now(), CLEANUP_BATCH_SIZE)
    .all();

  for (const row of result.results ?? []) {
    if (row.status === "uploading" && row.uploadId) {
      const multipartUpload = env.UPLOADS.resumeMultipartUpload(row.objectKey, row.uploadId);
      await multipartUpload.abort().catch(() => undefined);
    }

    await env.UPLOADS.delete(row.objectKey).catch(() => undefined);
    await env.DB.prepare("DELETE FROM transfers WHERE id = ?").bind(row.id).run();
  }
}

const sharesharpWorker = {
  async fetch(request, env, ctx) {
    const handler = await getOpenNextHandler();
    return handler.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    await cleanupExpiredTransfers(env);

    const handler = await getOpenNextHandler();
    if (typeof handler.scheduled === "function") {
      return handler.scheduled(event, env, ctx);
    }
  },
};

export default sharesharpWorker;
