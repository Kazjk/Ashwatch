import type {
  Ability,
  EnemyKind,
  HeroClass,
  PlayableClass,
} from "@ashwatch/content";
export type Phase =
  | "lobby"
  | "tutorial"
  | "ambush"
  | "boss"
  | "victory"
  | "defeat";
export type Session = {
  roomCode: string;
  playerId: string;
  token: string;
  host: boolean;
};
export type Intent = {
  sequence: number;
  moveX?: number;
  moveY?: number;
  facing?: number;
  ability?: Ability;
};
export type Contribution = {
  damage: number;
  healing: number;
  protection: number;
};
export type PlayerView = {
  id: string;
  name: string;
  heroClass: PlayableClass;
  host: boolean;
  ready: boolean;
  x: number;
  y: number;
  facing: number;
  hp: number;
  maxHp: number;
  ward: number;
  parrying: boolean;
  cooldowns: Partial<Record<Ability, number>>;
  contribution: Contribution;
  rewards: number;
};
export type Telegraph = {
  kind: "pounce" | "charge" | "heavy" | "sweep";
  resolvesAt: number;
  targetId?: string;
};
export type EnemyView = {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  telegraph?: Telegraph;
};
export type Snapshot = {
  roomCode: string;
  selfId: string;
  serverTime: number;
  phase: Phase;
  run: number;
  allReady: boolean;
  players: PlayerView[];
  enemies: EnemyView[];
  cues: Array<{
    id: string;
    direction: "left" | "right";
    intensity: "faint" | "urgent";
  }>;
  events: Array<{ id: number; text: string }>;
};
export type Request =
  | { action: "create"; name?: string; heroClass: HeroClass }
  | { action: "join"; room: string; name?: string; heroClass: HeroClass }
  | {
      action: "ready";
      room: string;
      player: string;
      token: string;
      ready: boolean;
    }
  | { action: "start" | "replay"; room: string; player: string; token: string }
  | {
      action: "intent";
      room: string;
      player: string;
      token: string;
      intent: Intent;
    };

export { parseRequest, parseSnapshotCredentials } from "./validation.ts";
