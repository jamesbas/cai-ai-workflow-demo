import { getCaseImage } from "@/lib/db/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const image = getCaseImage(id);
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.blob), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "private, max-age=60",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
