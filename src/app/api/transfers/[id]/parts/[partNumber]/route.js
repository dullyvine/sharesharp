import { HttpError, toErrorResponse, uploadTransferPart } from "@/lib/transfers";

export async function PUT(request, context) {
  try {
    const params = await context.params;
    const url = new URL(request.url);
    const uploadId = url.searchParams.get("uploadId");

    if (!uploadId) {
      throw new HttpError(400, "Upload ID is required.");
    }

    const chunk = await request.arrayBuffer();
    const part = await uploadTransferPart(
      params.id,
      uploadId,
      Number(params.partNumber),
      chunk,
    );

    return Response.json(part);
  } catch (error) {
    return toErrorResponse(error);
  }
}
