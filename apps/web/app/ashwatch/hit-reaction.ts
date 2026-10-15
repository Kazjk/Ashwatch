// One small, damped recoil after observed HP loss. Never a stun or predicted impact.
export function hitRecoil(now:number,hitAt:number|undefined,reduced=false){
 if(reduced||hitAt===undefined)return 0;
 const t=(now-hitAt)/180;
 return t<0||t>=1?0:Math.sin(t*Math.PI)*.14*(1-t);
}
