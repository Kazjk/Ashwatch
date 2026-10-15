export const OATHS = {
  lantern: {name:"Lantern", promise:"Read the dark", tradeoff:"+25 Awareness · 15% less health", health:.85, speed:1, damage:1, incoming:1, awareness:25},
  bastion: {name:"Bastion", promise:"Hold the line", tradeoff:"25% more health · 10% slower movement", health:1.25, speed:.9, damage:1, incoming:1, awareness:0},
  ember: {name:"Ember", promise:"End it swiftly", tradeoff:"15% more damage · take 15% more damage", health:1, speed:1, damage:1.15, incoming:1.15, awareness:0},
} as const;
export type OathId = keyof typeof OATHS;
export function oathId(value:unknown):OathId {
  if(typeof value!=="string"||!Object.hasOwn(OATHS,value))throw Error("Choose Lantern, Bastion or Ember for your company oath.");
  return value as OathId;
}
