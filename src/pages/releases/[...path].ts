import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals }) => {
  const key = params.path;
  if (!key || key.includes("..") || key.includes("\\") || key.startsWith("/")) {
    return new Response("Not found", { status: 404 });
  }

  const bucket = locals.runtime.env.RELEASES;
  const object = await bucket.get(`releases/${key}`);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const contentType =
    object.httpMetadata?.contentType || "application/octet-stream";
  const cacheControl =
    object.httpMetadata?.cacheControl || "public, max-age=3600";

  const ifNoneMatch = request.headers.get("If-None-Match");
  if (ifNoneMatch && ifNoneMatch === object.httpEtag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: object.httpEtag, "Cache-Control": cacheControl },
    });
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Cache-Control", cacheControl);
  headers.set("ETag", object.httpEtag);

  if (object.size !== undefined) {
    headers.set("Content-Length", String(object.size));
  }

  if (key.endsWith(".tar.gz")) {
    const raw = key.split("/").pop() || "download";
    const filename = raw.replace(/[^A-Za-z0-9._-]/g, "_");
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  }

  return new Response(object.body as ReadableStream, { headers });
};
