import { parseRequest, parseSnapshotCredentials } from "@ashwatch/protocol";
import { handle, snapshot } from "@ashwatch/server";

export const dynamic = "force-dynamic";
const MAX_REQUEST_BYTES = 2_048;

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "BAD_REQUEST";
  const status =
    code === "UNAUTHORIZED"
      ? 401
      : code === "ROOM_NOT_FOUND"
        ? 404
        : code === "PAYLOAD_TOO_LARGE"
          ? 413
          : 400;
  return Response.json({ error: code }, { status });
}

export async function GET(request: Request) {
  try {
    const credentials = parseSnapshotCredentials(
      request.url,
      request.headers.get("authorization"),
    );
    return Response.json(
      snapshot(credentials.room, credentials.player, credentials.token),
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    )
      throw new Error("UNSUPPORTED_MEDIA_TYPE");
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_REQUEST_BYTES)
      throw new Error("PAYLOAD_TOO_LARGE");
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES)
      throw new Error("PAYLOAD_TOO_LARGE");
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new Error("INVALID_JSON");
    }
    return Response.json(handle(parseRequest(value)));
  } catch (error) {
    return failure(error);
  }
}
