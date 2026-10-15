import {
  ABILITIES,
  PLAYABLE,
  STATS,
  type Ability,
  type EnemyKind,
  type HeroClass,
  type PlayableClass,
} from "@ashwatch/content";
import type {
  EnemyView,
  Intent,
  Phase,
  PlayerView,
  Session,
  Snapshot,
  Telegraph,
} from "@ashwatch/protocol";
type P = PlayerView & {
  token: string;
  lastSeq: number;
  parryUntil: number;
  wardUntil: number;
  wardOwner?: string;
  rewardedRun: number;
};
type E = EnemyView & {
  telegraph?: Telegraph & { tx: number; ty: number };
  nextAction: number;
  pattern: number;
};
type Room = {
  code: string;
  host: string;
  players: Map<string, P>;
  enemies: E[];
  phase: Phase;
  run: number;
  events: Array<{ id: number; text: string }>;
  eventId: number;
};
export type Options = {
  now?: () => number;
  id?: () => string;
  code?: () => string;
  healthScale?: number;
};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const delta = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
const secureRoomCode = () => {
  const value = crypto.getRandomValues(new Uint32Array(1))[0];
  return value.toString(36).padStart(7, "0").slice(-4).toUpperCase();
};
export class Simulation {
  private rooms = new Map<string, Room>();
  private now: () => number;
  private id: () => string;
  private code: () => string;
  private scale: number;
  constructor(o: Options = {}) {
    this.now = o.now ?? Date.now;
    this.id = o.id ?? (() => crypto.randomUUID());
    this.code = o.code ?? secureRoomCode;
    this.scale = o.healthScale ?? 1;
  }
  create(name: string, hero: HeroClass): Session {
    this.playable(hero);
    let code = this.code();
    while (this.rooms.has(code)) code = this.code();
    const host = this.id();
    const room: Room = {
      code,
      host,
      players: new Map(),
      enemies: [],
      phase: "lobby",
      run: 0,
      events: [],
      eventId: 1,
    };
    this.rooms.set(code, room);
    return this.add(room, name, hero as PlayableClass, host);
  }
  join(code: string, name: string, hero: HeroClass): Session {
    this.playable(hero);
    const r = this.rooms.get(code.toUpperCase());
    if (!r) throw Error("ROOM_NOT_FOUND");
    if (r.phase !== "lobby") throw Error("RUN_IN_PROGRESS");
    if (r.players.size >= 4) throw Error("ROOM_FULL");
    return this.add(r, name, hero as PlayableClass, this.id());
  }
  ready(code: string, pid: string, token: string, ready: boolean) {
    const { r, p } = this.auth(code, pid, token);
    if (r.phase !== "lobby") throw Error("INVALID_PHASE");
    if (typeof ready !== "boolean") throw Error("BAD_REQUEST");
    p.ready = ready;
    return this.view(r, p);
  }
  start(code: string, pid: string, token: string) {
    const { r, p } = this.auth(code, pid, token);
    if (r.phase !== "lobby") throw Error("INVALID_PHASE");
    if (!p.host) throw Error("HOST_ONLY");
    if (!this.allReady(r)) throw Error("PLAYERS_NOT_READY");
    r.run++;
    this.resetPlayers(r);
    this.phase(r, "tutorial");
    return this.view(r, p);
  }
  replay(code: string, pid: string, token: string) {
    const { r, p } = this.auth(code, pid, token);
    if (!p.host) throw Error("HOST_ONLY");
    if (!["victory", "defeat"].includes(r.phase)) throw Error("INVALID_PHASE");
    r.phase = "lobby";
    r.enemies = [];
    this.resetPlayers(r);
    for (const m of r.players.values()) m.ready = false;
    this.event(r, "Company regrouped.");
    return this.view(r, p);
  }
  intent(code: string, pid: string, token: string, i: Intent) {
    const { r, p } = this.auth(code, pid, token);
    if (!i || !Number.isSafeInteger(i.sequence) || i.sequence <= p.lastSeq)
      throw Error("STALE_INTENT");
    if (
      i.ability &&
      !(
        ["basic", "dodge", "cleave", "parry", "heal", "ward"] as string[]
      ).includes(i.ability)
    )
      throw Error("INVALID_ABILITY");
    const x = this.axis(i.moveX),
      y = this.axis(i.moveY);
    if (i.facing !== undefined && !Number.isFinite(i.facing))
      throw Error("INVALID_INTENT");
    p.lastSeq = i.sequence;
    this.advance(r);
    if (!["tutorial", "ambush", "boss"].includes(r.phase))
      throw Error("INVALID_PHASE");
    if (p.hp <= 0) throw Error("PLAYER_DOWN");
    const len = Math.hypot(x, y) || 1,
      s = STATS[p.heroClass];
    p.x = clamp(p.x + (x / Math.max(1, len)) * s.speed, -22, 22);
    p.y = clamp(p.y + (y / Math.max(1, len)) * s.speed, -22, 22);
    if (i.facing !== undefined) p.facing = i.facing;
    if (i.ability) this.ability(r, p, i.ability);
    this.advance(r);
    return this.view(r, p);
  }
  snapshot(code: string, pid: string, token: string) {
    const { r, p } = this.auth(code, pid, token);
    this.advance(r);
    return this.view(r, p);
  }
  private add(r: Room, name: string, hero: PlayableClass, id: string) {
    const s = STATS[hero],
      token = this.id();
    r.players.set(id, {
      id,
      token,
      name:
        name
          .replace(/[^\p{L}\p{N} _-]/gu, "")
          .trim()
          .slice(0, 18) || "Wanderer",
      heroClass: hero,
      host: id === r.host,
      ready: false,
      x: 0,
      y: 0,
      facing: 0,
      hp: s.hp,
      maxHp: s.hp,
      ward: 0,
      parrying: false,
      cooldowns: {},
      contribution: { damage: 0, healing: 0, protection: 0 },
      rewards: 0,
      lastSeq: -1,
      parryUntil: 0,
      wardUntil: 0,
      rewardedRun: -1,
    });
    return { roomCode: r.code, playerId: id, token, host: id === r.host };
  }
  private auth(code: string, id: string, token: string) {
    const r = this.rooms.get(code.toUpperCase()),
      p = r?.players.get(id);
    if (!r || !p || p.token !== token) throw Error("UNAUTHORIZED");
    return { r, p };
  }
  private axis(v?: number) {
    if (v === undefined) return 0;
    if (!Number.isFinite(v)) throw Error("INVALID_INTENT");
    return clamp(v, -1, 1);
  }
  private ability(r: Room, p: P, a: Ability) {
    const now = this.now();
    if ((p.cooldowns[a] ?? 0) > now) throw Error("ABILITY_COOLDOWN");
    if (a === "basic")
      this.hit(
        r,
        p,
        STATS[p.heroClass].range,
        0.85,
        STATS[p.heroClass].damage,
        false,
      );
    else if (a === "dodge") this.dodge(r, p);
    else if (p.heroClass === "Warrior" && a === "cleave")
      this.hit(
        r,
        p,
        ABILITIES.cleave.range,
        1.25,
        ABILITIES.cleave.damage,
        true,
      );
    else if (p.heroClass === "Warrior" && a === "parry") {
      p.parryUntil = now + ABILITIES.parry.duration;
      this.event(r, `${p.name} raises a timed parry.`);
    }
    else if (p.heroClass === "Healer" && a === "heal") this.heal(r, p);
    else if (p.heroClass === "Healer" && a === "ward") this.ward(r, p);
    else throw Error("WRONG_CLASS_ABILITY");
    p.cooldowns[a] = now + ABILITIES[a].cooldown;
  }
  private hit(
    r: Room,
    p: P,
    range: number,
    arc: number,
    damage: number,
    multi: boolean,
  ) {
    const targets = r.enemies
      .filter(
        (e) =>
          e.hp > 0 &&
          dist(e, p) <= range &&
          Math.abs(delta(Math.atan2(e.y - p.y, e.x - p.x), p.facing)) <= arc,
      )
      .sort((a, b) => dist(a, p) - dist(b, p));
    for (const e of multi ? targets : targets.slice(0, 1)) {
      const actual = Math.min(damage, e.hp);
      e.hp -= actual;
      p.contribution.damage += actual;
      this.event(r, `${p.name} deals ${actual}.`);
    }
    if (targets.length === 0)
      this.event(r, `${p.name}'s attack finds only shadow.`);
    if (r.enemies.length && r.enemies.every((e) => e.hp <= 0)) {
      if (r.phase === "tutorial") this.phase(r, "ambush");
      else if (r.phase === "ambush") this.phase(r, "boss");
      else if (r.phase === "boss") this.phase(r, "victory");
    }
  }
  private dodge(r: Room, p: P) {
    p.x = clamp(p.x + Math.cos(p.facing) * ABILITIES.dodge.distance, -22, 22);
    p.y = clamp(p.y + Math.sin(p.facing) * ABILITIES.dodge.distance, -22, 22);
    this.event(r, `${p.name} dodges clear.`);
  }
  private heal(r: Room, p: P) {
    const t = [...r.players.values()]
      .filter(
        (x) => x.hp > 0 && x.hp < x.maxHp && dist(x, p) <= ABILITIES.heal.range,
      )
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (!t) {
      this.event(r, `${p.name} finds no wounded ally in range.`);
      return;
    }
    const amount = Math.min(ABILITIES.heal.amount, t.maxHp - t.hp);
    t.hp += amount;
    p.contribution.healing += amount;
    this.event(r, `${p.name} restores ${amount}.`);
  }
  private ward(r: Room, p: P) {
    const t = [...r.players.values()]
      .filter((x) => x.hp > 0 && dist(x, p) <= ABILITIES.ward.range)
      .sort((a, b) => a.ward - b.ward)[0];
    if (!t) return;
    t.ward = Math.max(t.ward, ABILITIES.ward.amount);
    t.wardUntil = this.now() + ABILITIES.ward.duration;
    t.wardOwner = p.id;
    this.event(r, `${p.name} wards ${t.name}.`);
  }
  private advance(r: Room) {
    if (!["tutorial", "ambush", "boss"].includes(r.phase)) return;
    const now = this.now();
    for (const p of r.players.values())
      if (p.ward && p.wardUntil <= now) {
        p.ward = 0;
        p.wardOwner = undefined;
      }
    for (const e of r.enemies) {
      if (e.hp <= 0) continue;
      if (e.telegraph && e.telegraph.resolvesAt <= now) this.resolve(r, e);
      if (!e.telegraph && e.nextAction <= now) this.telegraph(r, e);
    }
    if ([...r.players.values()].every((p) => p.hp <= 0))
      this.phase(r, "defeat");
  }
  private telegraph(r: Room, e: E) {
    const target = [...r.players.values()]
      .filter((p) => p.hp > 0)
      .sort((a, b) => dist(a, e) - dist(b, e))[0];
    if (!target) return;
    let kind: Telegraph["kind"] = e.kind === "webstalker" ? "pounce" : "charge",
      wind = e.kind === "webstalker" ? 650 : 900;
    if (e.kind === "warden") {
      kind = e.pattern++ % 2 ? "sweep" : "heavy";
      wind = kind === "heavy" ? 1200 : 900;
    }
    e.telegraph = {
      kind,
      resolvesAt: this.now() + wind,
      targetId: target.id,
      tx: target.x,
      ty: target.y,
    };
    this.event(r, `${e.kind} telegraphs ${kind}.`);
  }
  private resolve(r: Room, e: E) {
    const t = e.telegraph!;
    if (t.kind === "pounce" || t.kind === "charge") {
      e.x = t.tx;
      e.y = t.ty;
    }
    const point = t.kind === "sweep" ? e : { x: t.tx, y: t.ty },
      radius = t.kind === "sweep" ? 4.5 : 2.2,
      damage = e.kind === "warden" ? (t.kind === "heavy" ? 58 : 34) : 26;
    for (const p of r.players.values())
      if (p.hp > 0 && dist(p, point) <= radius) this.damage(r, p, damage);
    e.telegraph = undefined;
    e.nextAction = this.now() + (e.kind === "warden" ? 1600 : 2100);
  }
  private damage(r: Room, p: P, n: number) {
    if (p.parryUntil >= this.now()) {
      this.event(r, `${p.name} parries.`);
      return;
    }
    const absorbed = Math.min(p.ward, n);
    p.ward -= absorbed;
    if (absorbed && p.wardOwner)
      r.players.get(p.wardOwner)!.contribution.protection += absorbed;
    p.hp = Math.max(0, p.hp - (n - absorbed));
  }
  private phase(r: Room, phase: Phase) {
    r.phase = phase;
    const n = this.now();
    if (phase === "tutorial")
      r.enemies = [this.enemy("tutorial", "webstalker", 2.4, 0, 36, n + 4000)];
    else if (phase === "ambush")
      r.enemies = [
        this.enemy("flank", "webstalker", -2.4, 0, 46, n + 1800),
        this.enemy("hound", "ash-hound", 2.4, 0, 54, n + 1000),
      ];
    else if (phase === "boss")
      r.enemies = [this.enemy("warden", "warden", 2.4, 0, 220, n + 1000)];
    else r.enemies = [];
    if (phase === "victory")
      for (const p of r.players.values())
        if (p.rewardedRun !== r.run) {
          p.rewardedRun = r.run;
          p.rewards++;
        }
    this.event(r, `Phase: ${phase}.`);
  }
  private enemy(
    id: string,
    kind: EnemyKind,
    x: number,
    y: number,
    hp: number,
    nextAction: number,
  ): E {
    const h = Math.max(1, Math.ceil(hp * this.scale));
    return { id, kind, x, y, hp: h, maxHp: h, nextAction, pattern: 0 };
  }
  private resetPlayers(r: Room) {
    for (const p of r.players.values()) {
      const s = STATS[p.heroClass];
      Object.assign(p, {
        x: 0,
        y: 0,
        facing: 0,
        hp: s.hp,
        maxHp: s.hp,
        ward: 0,
        parrying: false,
        cooldowns: {},
        contribution: { damage: 0, healing: 0, protection: 0 },
        lastSeq: -1,
        parryUntil: 0,
        wardUntil: 0,
      });
      p.wardOwner = undefined;
    }
  }
  private view(r: Room, v: P): Snapshot {
    const now = this.now(),
      visible = r.enemies.filter(
        (e) =>
          e.hp > 0 &&
          (dist(e, v) < 2.2 ||
            (dist(e, v) <= STATS[v.heroClass].awareness &&
              Math.abs(delta(Math.atan2(e.y - v.y, e.x - v.x), v.facing)) <=
                1.18)),
      );
    return {
      roomCode: r.code,
      selfId: v.id,
      serverTime: now,
      phase: r.phase,
      run: r.run,
      allReady: this.allReady(r),
      players: [...r.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        heroClass: p.heroClass,
        host: p.host,
        ready: p.ready,
        x: p.x,
        y: p.y,
        facing: p.facing,
        hp: p.hp,
        maxHp: p.maxHp,
        ward: p.ward,
        parrying: p.parryUntil >= now,
        cooldowns: Object.fromEntries(
          Object.entries(p.cooldowns).map(([a, t]) => [
            a,
            Math.max(0, t - now),
          ]),
        ),
        contribution: { ...p.contribution },
        rewards: p.rewards,
      })),
      enemies: visible.map((e) => ({
        id: e.id,
        kind: e.kind,
        x: e.x,
        y: e.y,
        hp: e.hp,
        maxHp: e.maxHp,
        telegraph: e.telegraph
          ? {
              kind: e.telegraph.kind,
              resolvesAt: e.telegraph.resolvesAt,
              targetId: e.telegraph.targetId,
            }
          : undefined,
      })),
      cues: r.enemies
        .filter(
          (e) =>
            e.hp > 0 &&
            !visible.includes(e) &&
            dist(e, v) < STATS[v.heroClass].awareness + 3,
        )
        .map((e) => ({
          id: `cue-${e.id}`,
          direction:
            delta(Math.atan2(e.y - v.y, e.x - v.x), v.facing) > 0
              ? "left"
              : "right",
          intensity: e.telegraph ? "urgent" : "faint",
        })),
      events: r.events.slice(-8),
    };
  }
  private allReady(r: Room) {
    return r.players.size > 0 && [...r.players.values()].every((p) => p.ready);
  }
  private event(r: Room, text: string) {
    r.events.push({ id: r.eventId++, text });
    if (r.events.length > 30) r.events.shift();
  }
  private playable(h: HeroClass) {
    if (!(PLAYABLE as readonly string[]).includes(h))
      throw Error("CLASS_NOT_AVAILABLE");
  }
}
export const simulation = new Simulation();
