import { HttpError, abortTransferUpload, toErrorResponse } from "@/lib/transfers";

export async function POST(request, context) {
  try {
    const params = await context.params;
    const url = new URL(request.url);
    const uploadId = url.searchParams.get("uploadId");

    if (!uploadId) {
      throw new HttpError(400, "Upload ID is required.");
    }

    await abortTransferUpload(params.id, uploadId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
