import { getTransferDetails, toErrorResponse } from "@/lib/transfers";

export async function GET(_request, context) {
  try {
    const params = await context.params;
    const origin = new URL(_request.url).origin;
    const transfer = await getTransferDetails(params.id, origin);

    if (!transfer) {
      return Response.json({ error: "Transfer not found." }, { status: 404 });
    }

    return Response.json(transfer);
  } catch (error) {
    return toErrorResponse(error);
  }
}
