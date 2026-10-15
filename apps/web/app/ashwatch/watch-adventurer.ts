import * as THREE from "three";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
import {combatPose,enemyMotion,type CombatAction} from "./combat.ts";
import type {ClassName} from "./progression.ts";
type Appearance={weapon?:string;hair?:string;accessory?:string;faction?:"ashen"};
export {PHYSIQUE} from "./adventurer.ts";
import {PHYSIQUE} from "./adventurer.ts";

// Original articulated meshes. The design favours a readable outline over tiny surface detail.
export function adventurer(cls:ClassName,appearance:Appearance={},preview=false){
 const group=new THREE.Group(),body=new THREE.Group();group.add(body);
 const physique=PHYSIQUE[cls];body.scale.set(physique.width,physique.height,physique.depth);
 const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[],pivots:THREE.Group[]=[body];
 const tank=cls==="Ironbound",rogue=cls==="Rogue",mage=cls==="Spellweaver",warden=cls==="Warden",caster=mage||warden,armored=tank||cls==="Knight";
 const ashen=appearance.faction==="ashen";
 const mat=(color:string,glow=false)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.82,metalness:0,flatShading:true,...(glow?{emissive:color,emissiveIntensity:.65}:{})});materials.push(m);return m;};
 const ink=mat(ashen?"#271f29":"#152936"),cloth=mat(ashen?"#713b43":{Knight:"#9f3948",Spellweaver:"#244b78",Ironbound:"#2c424f",Rogue:"#4f3664",Warden:"#236651"}[cls]);
 const clothLight=mat(ashen?"#b86c55":{Knight:"#d15c59",Spellweaver:"#5b86aa",Ironbound:"#526672",Rogue:"#896a9d",Warden:"#5e9e7a"}[cls]);
 const steel=mat(ashen?"#ad8171":tank?"#586d7b":"#93b4c4"),ivory=mat("#ece0ba"),gold=mat(ashen?"#d7ab72":"#d7aa53"),leather=mat("#453135"),skin=mat("#dfad91"),hair=mat(appearance.hair==="silver-hair"||mage?"#cbd9df":warden?"#b36b3e":"#293039"),light=mat(ashen?"#ffad62":mage?"#92e3f7":warden?"#baf5bd":"#ffe19c",true);
 // Original woven cloth texture; small enough to keep mobile memory bounded.
 const weaveCanvas=document.createElement("canvas");weaveCanvas.width=weaveCanvas.height=64;const weaveContext=weaveCanvas.getContext("2d")!;weaveContext.fillStyle="#e1e1e1";weaveContext.fillRect(0,0,64,64);for(let i=0;i<64;i++){weaveContext.fillStyle=i%2?"#cacaca":"#ededed";weaveContext.fillRect(i,0,1,64);weaveContext.fillStyle="rgba(50,50,50,.10)";weaveContext.fillRect(0,i,64,1);}const weave=new THREE.CanvasTexture(weaveCanvas);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(4,4);weave.colorSpace=THREE.SRGBColorSpace;
 steel.metalness=.62;steel.roughness=.29;gold.metalness=.68;gold.roughness=.34;cloth.map=weave;clothLight.map=weave;
 function mesh(p:THREE.Object3D,g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0){geometries.push(g);const a=new THREE.Mesh(g,m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;p.add(a);return a;}
 function box(p:THREE.Object3D,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number){return mesh(p,new RoundedBoxGeometry(w,h,d,1,Math.min(.025,w/6,h/6,d/6)),m,x,y,z);}
 function oval(p:THREE.Object3D,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number){const a=mesh(p,new THREE.SphereGeometry(1,14,10),m,x,y,z);a.scale.set(w,h,d);return a;}
 function taper(p:THREE.Object3D,m:THREE.Material,x:number,y:number,z:number,top:number,bottom:number,h:number,depth=1){const a=mesh(p,new THREE.CylinderGeometry(top,bottom,h,10),m,x,y,z);a.scale.z=depth;return a;}
 function plate(p:THREE.Object3D,m:THREE.Material,points:[number,number][],depth:number,x=0,y=0,z=0){const shape=new THREE.Shape(points.map(v=>new THREE.Vector2(...v)));return mesh(p,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:1,steps:1}),m,x,y,z);}
 function pivot(parent:THREE.Group,x:number,y:number,z=0){const a=new THREE.Group();a.position.set(x,y,z);parent.add(a);pivots.push(a);return a;}
 const torso=pivot(body,0,1.11);taper(torso,armored?steel:cloth,0,.23,0,tank?.32:.27,.17,.57,.65);
 if(armored){plate(torso,steel,[[-.22,.5],[-.27,.3],[-.15,.02],[0,-.02],[.15,.02],[.27,.3],[.22,.5]],.05,0,0,-.19);box(torso,gold,0,.32,-.25,.035,.3,.018);for(const side of [-1,1]){const rib=box(torso,gold,side*.16,.18,-.244,.019,.22,.025);rib.rotation.z=side*-.28;for(let i=0;i<3;i++)oval(torso,gold,side*(.21-i*.035),.42-i*.12,-.23,.013,.013,.012);}}
 if(armored){taper(torso,ink,0,.515,0,.115,.13,.10,.9);for(const side of [-1,1]){const collar=plate(torso,steel,[[0,0],[side*.12,.055],[side*.15,-.1],[0,-.045]],.05,0,.54,-.13);collar.rotation.y=side*.25;}}
 if(rogue){for(const side of [-1,1]){const band=box(torso,leather,side*.1,.24,-.21,.052,.49,.038);band.rotation.z=side*.46;}box(torso,gold,0,.25,-.25,.11,.04,.018);}
 if(caster){for(const side of [-1,1]){const stole=plate(torso,clothLight,[[side*.12,.56],[side*.22,.51],[side*.09,-.05],[side*.035,-.1]],.024,0,0,-.21);stole.rotation.y=side*.08;}}

 if(mage)plate(torso,ivory,[[-.22,.5],[-.04,.21],[0,.36],[.04,.21],[.22,.5]],.02,0,0,-.185);
 if(warden){plate(torso,ivory,[[-.27,.45],[0,.24],[.27,.45],[.22,.58],[0,.43],[-.22,.58]],.03,0,0,-.18);oval(torso,light,0,.3,-.22,.036,.05,.02);}
 const sash=box(torso,rogue?clothLight:leather,0,.17,-.2,rogue?.08:.055,.56,.035);sash.rotation.z=-.45;
 taper(body,leather,0,1.08,0,.195,.205,.09,.75);box(body,gold,0,1.08,-.163,.095,.07,.025);
 const hemY=caster?.77:.91,hemH=caster?.54:.25;
 for(const side of [-1,1]){const flap=plate(body,cloth,[[side*.02,.1],[side*.19,.1],[side*.26,-hemH],[side*.045,-hemH*.9]],.025,0,hemY+.22,-.16);flap.rotation.z=side*.07;box(body,gold,side*.12,hemY-hemH*.45,-.195,.06,.018,.02);}
 if(tank)for(const side of [-1,1])plate(body,steel,[[0,.13],[side*.25,.17],[side*.25,-.14],[side*.06,-.17]],.11,side*.12,1.02,-.12);
 const knees:THREE.Group[]=[],elbows:THREE.Group[]=[];
 const legs=[-1,1].map(side=>{const l=pivot(body,side*.13,1.02);taper(l,ink,0,-.19,0,.105,.085,.4,.84);const knee=pivot(l,0,-.39);knees.push(knee);taper(knee,armored?steel:leather,0,-.2,0,.087,.066,.37,.8);if(armored)plate(knee,steel,[[-.08,.025],[0,.09],[.08,.025],[.06,-.07],[-.06,-.07]],.07,0,0,-.11);box(knee,leather,0,-.46,-.066,.16,.13,.30);box(knee,ink,0,-.515,-.055,.18,.025,.33);return l;});
 const head=pivot(body,0,1.73);taper(body,ink,0,1.62,0,.07,.085,.16);
 if(cls==="Knight"||tank){
  taper(head,steel,0,.025,0,tank?.18:.16,.14,.34,.85);oval(head,steel,0,.2,.015,.175,.09,.15);
  plate(head,steel,[[-.14,.17],[0,.21],[.14,.17],[.13,-.1],[0,-.18],[-.13,-.1]],.02,0,0,-.155);
  box(head,ashen?light:ink,0,.035,-.19,.25,.036,.02);box(head,gold,0,.04,-.21,.017,.16,.018);
  for(const side of [-1,1])box(head,ink,side*.047,-.079,-.184,.012,.045,.018);
  if(tank)for(const side of [-1,1]){const horn=mesh(head,new THREE.ConeGeometry(.085,.32,4),gold,side*.19,.16,.02);horn.rotation.z=side*-.8;}
  else {const plume=plate(head,clothLight,[[-.025,0],[.05,.38],[.19,.26],[.1,.02]],.04,0,.23,.01);plume.rotation.y=Math.PI/2;}
 }else{
  oval(head,skin,0,.025,-.04,.128,.18,.11);oval(head,hair,0,.15,.025,.15,.12,.13);
  for(const side of [-1,1]){box(head,ivory,side*.05,.055,-.143,.049,.021,.008);box(head,ink,side*.05,.055,-.15,.012,.023,.006);const brow=box(head,hair,side*.05,.093,-.136,.058,.012,.009);brow.rotation.z=side*-.15;}
  if(rogue){oval(head,cloth,0,.115,.055,.19,.245,.15);plate(head,ink,[[-.11,.05],[.11,.05],[.1,-.08],[0,-.14],[-.1,-.08]],.02,0,0,-.157);}
  if(mage){const hood=plate(head,cloth,[[-.20,-.12],[-.23,.17],[0,.4],[.23,.17],[.20,-.12],[.12,-.12],[.15,.16],[0,.26],[-.15,.16],[-.12,-.12]],.18,0,0,.01);hood.rotation.y=Math.PI;for(let i=0;i<5;i++){const fringe=mesh(head,new THREE.ConeGeometry(.035,.15,4),hair,(i-2)*.04,.12,-.12);fringe.rotation.z=(i-2)*.18;fringe.rotation.x=Math.PI;}}
  if(warden){for(const side of [-1,1])oval(head,hair,side*.11,-.08,.025,.045,.23,.08);for(let i=0;i<5;i++){const leaf=mesh(head,new THREE.OctahedronGeometry(.055,0),gold,(i-2)*.05,.19+Math.sin(i*Math.PI/4)*.035,-.135);leaf.scale.y=1.8;}}
 }
 if(appearance.hair==="braid")for(let i=0;i<7;i++)oval(head,hair,.075,.12-i*.065,.14,.035,.045,.04);
 if(appearance.accessory==="circlet")mesh(head,new THREE.TorusGeometry(.145,.012,4,16),gold,0,.13,0).rotation.x=Math.PI/2;
 if(appearance.accessory==="earring")mesh(head,new THREE.TorusGeometry(.025,.006,4,12),gold,.13,-.025,-.02);
 const arms=[-1,1].map(side=>{const a=pivot(body,side*(tank?.32:.255),1.5);if(armored){const pauldron=plate(a,steel,[[-.13,.03],[-.14,-.12],[0,-.18],[.14,-.12],[.13,.03],[0,.12]],.22,0,0,-.11);pauldron.rotation.z=side*-.12;box(a,gold,0,.01,-.125,.2,.022,.02);}taper(a,caster?cloth:ink,0,-.15,0,.085,.065,.32,.8);const elbow=pivot(a,0,-.3);elbows.push(elbow);taper(elbow,armored?steel:cloth,0,-.13,0,.09,.055,.26,.8);box(elbow,leather,0,-.295,-.01,.105,.13,.085);return a;});
 const equipped=preview||!!appearance.weapon;
 if(equipped){
  if(tank){taper(elbows[1],leather,0,-.28,-.4,.025,.025,1.2);const hammer=mesh(elbows[1],new THREE.CylinderGeometry(.23,.23,.65,8),steel,0,.28,-.4);hammer.rotation.z=Math.PI/2;for(const side of [-1,1]){const rim=mesh(elbows[1],new THREE.CylinderGeometry(.26,.26,.06,8),gold,side*.30,.28,-.4);rim.rotation.z=Math.PI/2;}for(const side of [-1,1])box(elbows[1],ink,side*.10,.28,-.635,.035,.27,.015);}
  else if(caster){taper(elbows[1],leather,0,.18,-.08,.026,.032,1.48);mesh(elbows[1],new THREE.TorusGeometry(warden?.17:.14,.024,5,16),gold,0,.98,-.08);mesh(elbows[1],new THREE.OctahedronGeometry(.085,0),light,0,.98,-.08);if(warden)for(const side of [-1,1]){const leaf=mesh(elbows[1],new THREE.OctahedronGeometry(.08,0),clothLight,side*.17,.93,-.08);leaf.scale.set(.7,1.5,.4);leaf.rotation.z=side*-.6;}}
  else for(const side of rogue?[-1,1]:[1]){const hand=elbows[side===1?1:0];box(hand,leather,0,-.29,-.1,.055,.06,.20);box(hand,gold,0,-.29,-.18,.22,.03,.035);plate(hand,steel,[[-.04,0],[.04,0],[.033,rogue?-.42:-.85],[0,rogue?-.53:-1],[-.033,rogue?-.42:-.85]],.025,0,-.29,-.18).rotation.x=Math.PI/2;}
  if(cls==="Knight"){plate(elbows[0],ink,[[-.22,.23],[.22,.23],[.19,-.19],[0,-.39],[-.19,-.19]],.08,0,-.15,-.16);plate(elbows[0],cloth,[[-.19,.20],[.19,.20],[.16,-.16],[0,-.34],[-.16,-.16]],.013,0,-.15,-.18);box(elbows[0],ivory,0,-.17,-.20,.035,.4,.018);box(elbows[0],ivory,0,-.08,-.20,.23,.025,.018);}
 }
 if(tank)for(const [i,a] of arms.entries()){for(let j=0;j<3;j++){const scale=plate(a,steel,[[-.12,0],[.12,0],[.10,-.11],[0,-.16],[-.1,-.11]],.035,0,-.05-j*.075,-.15-j*.012);scale.rotation.z=(i?1:-1)*-.12;}box(a,gold,0,.095,-.085,.20,.035,.035);}
 if(mage){for(const side of [-1,1]){const shard=mesh(elbows[1],new THREE.OctahedronGeometry(.045,0),light,side*.14,1.10,-.08);shard.scale.y=1.6;}mesh(elbows[1],new THREE.TorusGeometry(.23,.013,4,20,Math.PI*1.55),steel,0,1.01,-.08).rotation.z=.7;}
 if(rogue){for(const side of [-1,1]){const pouch=box(body,leather,side*.21,1.03,.03,.105,.15,.12);pouch.rotation.z=side*.12;box(body,gold,side*.21,1.045,-.035,.075,.012,.02);}}
 if(warden){for(let i=0;i<4;i++){const braid=oval(head,hair,.13,-.02-i*.065,.04,.027,.04,.035);braid.rotation.z=.15;}box(head,gold,.13,-.25,.04,.035,.026,.043);}
 const cloakHeight=rogue?.57:caster?1.12:.90,cloakWidth=tank?.76:rogue?.41:.6;
 const capeGeo=new THREE.PlaneGeometry(cloakWidth,cloakHeight,6,8),pos=capeGeo.attributes.position,rest=new Float32Array(pos.array);
 const capeMaterial=cloth.clone();capeMaterial.roughness=.95;capeMaterial.side=THREE.DoubleSide;materials.push(capeMaterial);const cape=mesh(body,capeGeo,capeMaterial,rogue?-.08:0,1.51-cloakHeight/2,.20);
 mesh(body,new THREE.TorusGeometry(.115,.013,4,16),gold,0,1.27,.32);
 const emblem=mesh(body,new THREE.OctahedronGeometry(.06,0),caster?light:gold,0,1.27,.335);emblem.scale.set(1,1.4,.3);
 box(body,clothLight,0,1.54,.045,.4,.08,.27).rotation.x=.1;
 // Batch each pivot by surface so bronze, plate and cloth keep distinct light response.
 const surfaces={metal:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.3,metalness:.62}),cloth:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,map:weave}),matte:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78})};materials.push(...Object.values(surfaces));
 for(const p of pivots){const batches=new Map<keyof typeof surfaces,THREE.BufferGeometry[]>();for(const child of [...p.children]){if(!(child instanceof THREE.Mesh)||child===cape||child.material===light)continue;child.updateMatrix();const g=child.geometry.clone().applyMatrix4(child.matrix),normalized=g.index?g.toNonIndexed():g;if(g.index)g.dispose();const surface=child.material===steel||child.material===gold?"metal":child.material===cloth||child.material===clothLight?"cloth":"matte";for(const key of Object.keys(normalized.attributes))if(!["position","normal","uv"].includes(key))normalized.deleteAttribute(key);if(!normalized.attributes.uv)normalized.setAttribute("uv",new THREE.Float32BufferAttribute(new Float32Array(normalized.attributes.position.count*2),2));const color=(child.material as THREE.MeshStandardMaterial).color,colors=new Float32Array(normalized.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}normalized.setAttribute("color",new THREE.BufferAttribute(colors,3));const parts=batches.get(surface)??[];parts.push(normalized);batches.set(surface,parts);p.remove(child);}for(const [surface,parts] of batches){const merged=mergeGeometries(parts);if(merged){geometries.push(merged);const combined=new THREE.Mesh(merged,surfaces[surface]);combined.castShadow=true;combined.receiveShadow=true;p.add(combined);}parts.forEach(g=>g.dispose());}}
 let gait=0,stride=0,lastAnimationTime=0,chill=0;const solePoint=new THREE.Vector3(),verticalAxis=new THREE.Vector3(),soleCorners=[-.09,.09].flatMap(x=>[-.22,.11].map(z=>new THREE.Vector3(x,-.5275,z)));
 const frostColor=new THREE.Color("#b2dff0"),neutral=new THREE.Color("#ffffff");group.userData.appearance=[appearance.weapon,appearance.hair,appearance.accessory].join("|");
 return {group,left:legs[0],right:legs[1],arm:arms[1],cape,
  setFrost(active:boolean,seconds:number){chill+=(Number(active)-chill)*(1-Math.exp(-8*seconds));for(const surface of Object.values(surfaces)){surface.color.copy(neutral).lerp(frostColor,chill*.55);surface.emissive.copy(frostColor);surface.emissiveIntensity=chill*.19;}surfaces.metal.roughness=.3+chill*.25;},
  animate(time:number,movement:number,attack=0,dash=0,reduced=false,action?:CombatAction|null,serverTime?:number){
   const pose=action?combatPose(action,serverTime??time*1000):{windup:0,strike:attack,recovery:0};const windup=pose.windup,hit=pose.strike;
   const dt=lastAnimationTime?Math.max(0,Math.min(.1,time-lastAnimationTime)):1/60;lastAnimationTime=time;const t=reduced?0:time,oldWalk=reduced?0:Math.sqrt(gait);gait+=(Math.max(0,Math.min(1,movement))-gait)*(1-Math.exp(-10*dt));const walk=reduced?0:Math.sqrt(gait);
   stride=(stride+dt*25/physique.height/Math.max(.1,group.scale.x)*(oldWalk+walk)*.5)%(Math.PI*2);const cycle=stride;
   body.position.y=0;body.rotation.x=dash*-.28+(rogue?-.08:0);body.rotation.y=Math.sin(cycle)*walk*.055;head.rotation.y=Math.sin(t*.7)*.025;
   legs.forEach((leg,i)=>{const step=Math.sin(cycle+i*Math.PI)*walk;leg.rotation.x=step*.48;knees[i].rotation.x=Math.max(0,-step)*.8;});arms.forEach((arm,i)=>{arm.rotation.set(-Math.sin(cycle+i*Math.PI)*walk*.28,0,(i?1:-1)*.07);elbows[i].rotation.x=-.10;});
   if(ashen&&action){const motion=enemyMotion(action,serverTime??time*1000);body.rotation.x+=motion.bodyX;body.rotation.y+=motion.bodyY;arms[1].rotation.set(motion.armX,motion.armY,motion.armZ);arms[0].rotation.x=motion.braceX;elbows[1].rotation.x=motion.elbowX;legs[0].rotation.x+=windup*.16;legs[1].rotation.x-=windup*.12;}
   else if(caster){arms[1].rotation.x-=windup*.45+hit*1.3;arms[0].rotation.x-=windup*.7+hit*.9;arms[0].rotation.z-=hit*.28;elbows[1].rotation.x-=windup*.35;}
   else if(tank){arms[1].rotation.x-=windup*2.1+hit*.5;elbows[1].rotation.x-=windup*.6;body.rotation.x-=windup*.11;body.rotation.x+=hit*.13;arms[0].rotation.x-=windup*.5;}
   else if(rogue){body.rotation.y+=windup*.45-hit*.4;arms[1].rotation.x+=windup*.3-hit*.7;arms[1].rotation.z-=hit*.7;arms[0].rotation.x-=hit*.6;body.rotation.x-=hit*.12;}
   else {body.rotation.y+=windup*.6-hit*.6;arms[1].rotation.x-=windup*.9+hit*.45;arms[1].rotation.z+=windup*.6-hit*1.15;arms[0].rotation.x-=windup*.35+hit*.55;}
   // Keep a boot on the actual actor floor as legs bend and the body leans.
   // Only the original sole bounds are transformed; no per-frame meshes or IK tree.
   if(Math.abs(group.rotation.z)<.5&&Math.abs(group.rotation.x)<.5){
    body.updateMatrix();group.updateMatrix();let lowest=Infinity;
    for(const [i,leg] of legs.entries()){leg.updateMatrix();knees[i].updateMatrix();for(const corner of soleCorners){solePoint.copy(corner).applyMatrix4(knees[i].matrix).applyMatrix4(leg.matrix).applyMatrix4(body.matrix).applyMatrix4(group.matrix);lowest=Math.min(lowest,solePoint.y);}}
    const vertical=Math.max(.1,verticalAxis.set(0,1,0).transformDirection(group.matrix).y*group.scale.y);body.position.y=-(lowest-group.position.y)/vertical;
   }else body.position.y=-.1025*physique.height;
   for(let i=0;i<pos.count;i++){const x=rest[i*3],y=rest[i*3+1],f=(cloakHeight/2-y)/cloakHeight;pos.setXYZ(i,x*(.65+f*.5),y+Math.pow(f,4)*Math.abs(x)*.2,.05+f*f*.09+(reduced?0:Math.sin(t*4+x*9-y*6)*f*.028)+walk*f*.13+windup*f*.03);}pos.needsUpdate=true;capeGeo.computeVertexNormals();
  },dispose(){weave.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
 };
}
