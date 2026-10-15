import * as THREE from "three";

export type ClickTarget={group:THREE.Object3D;x:number;y:number};

function solid(object:THREE.Object3D){
 for(let node:THREE.Object3D|null=object;node;node=node.parent)if(!node.visible||node.name==="health"||node.name==="company-label")return false;
 if(!(object instanceof THREE.Mesh))return false;
 const materials=Array.isArray(object.material)?object.material:[object.material];
 return materials.some(m=>m.visible&&m.opacity>.8);
}

// Candidates must come only from the current recipient snapshot. Retained hidden
// meshes, health bars and scenery can never become an aim target through this API.
export function clickedFacing(ray:THREE.Raycaster,candidates:ClickTarget[],origin:{x:number;y:number},blockers:THREE.Object3D[]=[]):number|undefined{
 let picked:ClickTarget|undefined,nearest=Infinity;
 for(const candidate of candidates){
  candidate.group.updateWorldMatrix(true,true);
  const hit=ray.intersectObject(candidate.group,true).find(h=>solid(h.object));
  if(hit&&hit.distance<nearest){nearest=hit.distance;picked=candidate;}
 }
 if(!picked)return undefined;
 for(const blocker of blockers){
  blocker.updateWorldMatrix(true,true);
  if(ray.intersectObject(blocker,true).some(h=>h.distance+.01<nearest&&solid(h.object)))return undefined;
 }
 return Math.atan2(picked.y-origin.y,picked.x-origin.x);
}
