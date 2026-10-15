import {
  ABILITIES,
  PLAYABLE,
  type Ability,
  type HeroClass,
} from "@ashwatch/content";
import type { Intent, Request } from "./index.ts";

const ACTIONS = new Set([
  "create",
  "join",
  "ready",
  "start",
  "replay",
  "intent",
]);
const ABILITY_IDS = new Set(Object.keys(ABILITIES));
const ROOM_CODE = /^[A-Z0-9]{4}$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("BAD_REQUEST");
  return value as Record<string, unknown>;
}

function text(value: unknown, code: string, maximum = 128) {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum)
    throw new Error(code);
  return value;
}

function optionalName(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > 64)
    throw new Error("INVALID_NAME");
  return value;
}

function credentials(body: Record<string, unknown>) {
  const room = text(body.room, "INVALID_ROOM", 4).toUpperCase();
  const player = text(body.player, "INVALID_PLAYER", 64);
  const token = text(body.token, "INVALID_TOKEN", 64);
  if (!ROOM_CODE.test(room) || !UUID.test(player) || !UUID.test(token))
    throw new Error("INVALID_CREDENTIALS");
  return { room, player, token };
}

function parseIntent(value: unknown): Intent {
  const body = record(value);
  if (!Number.isSafeInteger(body.sequence) || Number(body.sequence) < 0)
    throw new Error("INVALID_SEQUENCE");
  for (const key of ["moveX", "moveY", "facing"] as const) {
    const coordinate = body[key];
    if (
      coordinate !== undefined &&
      (typeof coordinate !== "number" || !Number.isFinite(coordinate))
    )
      throw new Error("INVALID_INTENT");
  }
  if (
    body.ability !== undefined &&
    (typeof body.ability !== "string" || !ABILITY_IDS.has(body.ability))
  )
    throw new Error("INVALID_ABILITY");
  return {
    sequence: Number(body.sequence),
    moveX: body.moveX as number | undefined,
    moveY: body.moveY as number | undefined,
    facing: body.facing as number | undefined,
    ability: body.ability as Ability | undefined,
  };
}

export function parseRequest(value: unknown): Request {
  const body = record(value);
  if (typeof body.action !== "string" || !ACTIONS.has(body.action))
    throw new Error("UNKNOWN_ACTION");
  if (body.action === "create" || body.action === "join") {
    const heroClass = text(
      body.heroClass,
      "CLASS_NOT_AVAILABLE",
      24,
    ) as HeroClass;
    if (!(PLAYABLE as readonly string[]).includes(heroClass))
      throw new Error("CLASS_NOT_AVAILABLE");
    const name = optionalName(body.name);
    if (body.action === "create") return { action: "create", name, heroClass };
    const room = text(body.room, "INVALID_ROOM", 4).toUpperCase();
    if (!ROOM_CODE.test(room)) throw new Error("INVALID_ROOM");
    return { action: "join", room, name, heroClass };
  }
  const auth = credentials(body);
  if (body.action === "ready") {
    if (typeof body.ready !== "boolean") throw new Error("BAD_REQUEST");
    return { action: "ready", ...auth, ready: body.ready };
  }
  if (body.action === "start" || body.action === "replay")
    return { action: body.action, ...auth };
  return { action: "intent", ...auth, intent: parseIntent(body.intent) };
}

export function parseSnapshotCredentials(
  url: string,
  authorization: string | null,
) {
  const query = new URL(url).searchParams;
  return credentials({
    room: query.get("room"),
    player: query.get("player"),
    token: authorization?.startsWith("Bearer ") ? authorization.slice(7) : "",
  });
}
