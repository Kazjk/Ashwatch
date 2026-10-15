import type {Monster} from "./world.ts";

// Shared names and silhouettes keep rehearsal faithful to the actual watch.
export function watchEnemy(kind:Monster["kind"]){
 if(kind==="boss")return {name:"Ashen guardian",heroClass:"Ironbound" as const,scale:1.4};
 if(kind==="sentinel")return {name:"Sentinel",heroClass:"Knight" as const,scale:1};
 return {name:"Ashen scout",heroClass:"Knight" as const,scale:.88};
}
