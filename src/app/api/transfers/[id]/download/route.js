import { getDownloadResponse, toErrorResponse } from "@/lib/transfers";

export async function GET(request, context) {
  try {
    const params = await context.params;
    const origin = new URL(request.url).origin;
    return await getDownloadResponse(params.id, origin);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function HEAD(request, context) {
  try {
    const params = await context.params;
    const origin = new URL(request.url).origin;
    return await getDownloadResponse(params.id, origin, { headOnly: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
