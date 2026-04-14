import { createTransferSession, toErrorResponse } from "@/lib/transfers";

export async function POST(request) {
  try {
    const payload = await request.json();
    const origin = new URL(request.url).origin;
    const transfer = await createTransferSession(payload, origin);
    return Response.json(transfer, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
