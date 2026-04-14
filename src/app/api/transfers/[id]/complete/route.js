import {
  HttpError,
  completeTransferUpload,
  toErrorResponse,
} from "@/lib/transfers";

export async function POST(request, context) {
  try {
    const params = await context.params;
    const payload = await request.json();
    const origin = new URL(request.url).origin;

    if (typeof payload?.uploadId !== "string" || !payload.uploadId.length) {
      throw new HttpError(400, "Upload ID is required.");
    }

    const transfer = await completeTransferUpload(
      params.id,
      payload.uploadId,
      payload.parts,
      origin,
    );

    return Response.json(transfer);
  } catch (error) {
    return toErrorResponse(error);
  }
}
