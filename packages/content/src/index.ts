export const CLASSES = [
  "Warrior",
  "Mage",
  "Ironbound",
  "Healer",
  "Rogue",
] as const;
export type HeroClass = (typeof CLASSES)[number];
export const PLAYABLE = ["Warrior", "Healer"] as const;
export type PlayableClass = (typeof PLAYABLE)[number];
export type Ability =
  | "basic"
  | "dodge"
  | "cleave"
  | "parry"
  | "heal"
  | "ward";
export type EnemyKind = "webstalker" | "ash-hound" | "warden";
export const STATS = {
  Warrior: { hp: 120, speed: 0.56, range: 2.7, damage: 18, awareness: 6 },
  Healer: { hp: 96, speed: 0.56, range: 6, damage: 8, awareness: 6.5 },
} as const;
export const ABILITIES = {
  basic: { cooldown: 480 },
  dodge: { cooldown: 2500, distance: 2.4 },
  cleave: { cooldown: 3000, damage: 28, range: 3.2 },
  parry: { cooldown: 5000, duration: 1000 },
  heal: { cooldown: 4000, amount: 32, range: 6 },
  ward: { cooldown: 6000, amount: 36, duration: 5000, range: 6 },
} as const;
export const PHASES = {
  lobby: "Muster at the watchfire",
  tutorial: "The first rustle",
  ambush: "Hold the crossing",
  boss: "The Hollow Warden",
  victory: "The watch holds",
  defeat: "The watchfire gutters",
} as const;
export const PHASE_DETAILS = {
  lobby: "Share the room code, choose complementary roles, and ready together.",
  tutorial:
    "Move to face the Webstalker. Turn away to hear danger without seeing its exact position.",
  ambush:
    "The hound charges where you stood while the Webstalker pounces from your blind side.",
  boss: "Watch the warning ring: move from heavy blows and spread for the Warden's sweep.",
  victory:
    "Your company earned one Ember Mark. Review contributions, then regroup.",
  defeat:
    "The crossing overwhelmed your company. Review the tells and try again.",
} as const;

export const ENEMY_NAMES: Record<EnemyKind, string> = {
  webstalker: "Webstalker",
  "ash-hound": "Ash-hound",
  warden: "Hollow Warden",
};
