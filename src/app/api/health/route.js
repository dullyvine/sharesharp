export async function GET() {
  return Response.json({
    ok: true,
    service: "sharesharp",
    timestamp: Date.now(),
  });
}
