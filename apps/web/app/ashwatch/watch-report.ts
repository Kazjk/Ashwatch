import type {Watch} from "./world.ts";

export type Rehearsal={contact:boolean;evaded:boolean;opening:boolean;called:boolean};
export type WatchChapter={stage:number;seconds:number;hits:number;evades:number;openings:number;covers:number};
export type WatchJournal={attempt:number;regroupUntil:number;stageStartedAt:number;openings:number;misses:number;hitsByKind:Record<"scout"|"sentinel"|"strike"|"sweep",number>;chapters:WatchChapter[]};
export const ENCOUNTERS=["The first tell","The divided watch","The ashen guardian"] as const;

// Advice refers only to counted events, never inferred intent or hidden enemy positions.
export function watchAdvice(w:Watch):string {
 if(w.hitsByKind.sweep>0)return `${w.hitsByKind.sweep} wide ${w.hitsByKind.sweep===1?"sweep":"sweeps"} connected. Watch the guardian coil sideways and give its sweeping weapon room; return as the stance settles.`;
 if(w.hitsByKind.sentinel>0)return `${w.hitsByKind.sentinel} sentinel strikes connected. Their web slows escape. Keep space to dash; a Warden can face a webbed teammate and use Renew to cleanse.`;
 if(w.hitsByKind.strike>0)return `${w.hitsByKind.strike} guardian ground strikes connected. Watch the raised weapon and move decisively as it comes down. Late in the fight, the guardian follows the strike in.`;
 if(w.hitsByKind.scout>0)return `${w.hitsByKind.scout} scout strikes connected. Read its crouch, step or dash clear, then face it as it settles after striking.`;
 if(w.misses>0)return `${w.misses} ${w.misses===1?"attack":"attacks"} released without a target. The target card shows distance and stone obstruction. Face and close before committing.`;
 if(w.openings>0)return `You landed ${w.openings} attacks during enemy recovery for 30% more damage. Keep that rhythm: read, evade, face, commit.`;
 return "No damaging contacts were recorded. Try the harmless drill before your next watch: read the raised weapon, evade, then strike as the stance settles.";
}
