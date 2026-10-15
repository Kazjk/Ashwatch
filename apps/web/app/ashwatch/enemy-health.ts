// Use only an enemy already present in this recipient's snapshot.
// Damage reveals its health bar; losing perception removes the entire actor.
export function enemyHealth(hp:number,maxHp:number){
 const maximum=Number.isFinite(maxHp)&&maxHp>0?maxHp:0;
 const remaining=Number.isFinite(hp)?Math.max(0,Math.min(maximum,hp)):0;
 return {visible:maximum>0&&remaining>0&&remaining<maximum,fraction:maximum?remaining/maximum:0,remaining:Math.ceil(remaining),maximum:Math.ceil(maximum)};
}
