import type {ClassName} from "./progression.ts";
// Human scale for the survival world; roles are identified by equipment and motion.
export const FRONTIER_PHYSIQUE={
 Knight:{width:1,height:1,depth:1},Spellweaver:{width:.94,height:.99,depth:.96},
 Ironbound:{width:1.14,height:1.07,depth:1.08},Rogue:{width:.91,height:.97,depth:.93},
 Warden:{width:.97,height:1,depth:.97}
} satisfies Record<ClassName,{width:number;height:number;depth:number}>;
