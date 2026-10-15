import * as THREE from "three";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";
import {CLASSES,type ClassName} from "./progression.ts";
type Appearance={weapon?:string;hair?:string;accessory?:string};
export const PHYSIQUE={Knight:{width:1,height:1,depth:1},Spellweaver:{width:.82,height:.86,depth:.85},Ironbound:{width:1.5,height:1.28,depth:1.3},Rogue:{width:.73,height:.82,depth:.77},Warden:{width:.9,height:.96,depth:.92}} as const;
export function adventurer(cls:ClassName,appearance:Appearance={},preview=false){
 const group=new THREE.Group(),body=new THREE.Group();group.add(body);
 const physique=PHYSIQUE[cls];body.scale.set(physique.width,physique.height,physique.depth);
 const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[];
 const material=(color:string,metal=0,glow=false)=>{const m=new THREE.MeshStandardMaterial({color,metalness:metal,roughness:metal?.34:.78,...(glow?{emissive:color,emissiveIntensity:1.3}: {})});materials.push(m);return m;};
 const fabric={Knight:"#8d3940",Spellweaver:"#315b83",Ironbound:"#394e62",Rogue:"#493958",Warden:"#49745f"}[cls];
 const skin=material("#f0c6aa"),cloth=material(fabric),dark=material("#202837"),leather=material("#493326"),steel=material(cls==="Ironbound"?"#7b8698":"#b6c6d4",.72),gold=material("#d7b575",.7),ivory=material("#e5d9be"),hair=material(appearance.hair==="silver-hair"||cls==="Spellweaver"?"#d4dfed":cls==="Warden"?"#bb7648":"#39333f"),eye=material(cls==="Spellweaver"?"#659be9":cls==="Warden"?"#70a997":"#bb9561");
 function mesh(parent:THREE.Object3D,g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0){geometries.push(g);const a=new THREE.Mesh(g,m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;}
 const oval=(p:THREE.Object3D,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number)=>{const a=mesh(p,new THREE.SphereGeometry(1,18,12),m,x,y,z);a.scale.set(w,h,d);return a;};
 const rounded=(p:THREE.Object3D,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,r=.025)=>mesh(p,new RoundedBoxGeometry(w,h,d,2,r),m,x,y,z);
 const tube=(p:THREE.Object3D,m:THREE.Material,points:number[][],r=.013)=>mesh(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v as [number,number,number]))),12,r,5,false),m);
 const caster=cls==="Spellweaver"||cls==="Warden",tank=cls==="Ironbound",rogue=cls==="Rogue",width=tank?1.16:1,armored=!caster&&!rogue;
 // A tapered torso, layered collar and fitted waist replace the box-shaped mannequin.
 const chest=mesh(body,new THREE.LatheGeometry([new THREE.Vector2(.15,.0),new THREE.Vector2(.19,.08),new THREE.Vector2(.20,.2),new THREE.Vector2(.27,.4),new THREE.Vector2(.23,.51),new THREE.Vector2(.14,.56)],24),caster||rogue?cloth:steel,0,1.04,0);chest.scale.z=.63;chest.scale.x=width;
 oval(body,leather,0,1.03,0,.21*width,.13,.14);mesh(body,new THREE.CylinderGeometry(.208,.205,.065,24),leather,0,1.095,0).scale.z=.72;rounded(body,gold,0,1.095,-.16,.065,.075,.025,.012);
 for(const side of [-1,1]){const collar=rounded(body,caster?ivory:gold,side*.105,1.53,-.1,.08,.24,.035,.013);collar.rotation.z=side*-.38;tube(body,gold,[[side*.16,1.43,-.16],[side*.2,1.28,-.15],[side*.13,1.16,-.12]],.006);}
 const skirt=new THREE.Group();body.add(skirt);const skirtGeometry=new THREE.CylinderGeometry(.19,.29,caster?.54:.26,24,1,true);mesh(skirt,skirtGeometry,cloth,0,caster?.89:1,0).scale.z=.62;
 for(let i=0;i<8;i++){const angle=i*Math.PI/4;const a=rounded(skirt,caster?ivory:leather,Math.sin(angle)*.24,caster?.67:.93,Math.cos(angle)*.15,.035,caster?.1:.08,.025,.01);a.rotation.y=angle;}
 // Articulated upper and lower legs give a natural stride and knee bend.
 if(tank){rounded(body,steel,0,1.32,-.12,.5,.38,.14,.065);for(const side of [-1,1]){rounded(body,steel,side*.23,1.04,0,.16,.25,.25,.04);tube(body,gold,[[side*.21,1.47,-.18],[side*.22,1.32,-.205],[side*.16,1.16,-.18]],.014);}}
 if(rogue){const strap=rounded(body,leather,0,1.32,-.16,.055,.54,.035,.01);strap.rotation.z=-.42;mesh(body,new THREE.TorusGeometry(.11,.034,6,20),cloth,0,1.57,0).rotation.x=Math.PI/2;rounded(body,leather,.21,1.05,-.02,.09,.14,.10,.02);}
 if(cls==='Warden'){oval(body,ivory,0,1.49,-.04,.21,.065,.15);mesh(body,new THREE.OctahedronGeometry(.034,0),gold,0,1.38,-.19);}
 const knees:THREE.Group[]=[];
 const legs=[-1,1].map(side=>{const l=new THREE.Group();l.position.set(side*.125*width,1.02,0);body.add(l);mesh(l,new THREE.CapsuleGeometry(.085,.27,4,10),dark,0,-.19,0);const knee=new THREE.Group();knee.position.y=-.4;l.add(knee);knees.push(knee);mesh(knee,new THREE.CapsuleGeometry(.075,.25,4,10),leather,0,-.19,0);rounded(knee,armored?steel:leather,0,-.03,-.06,.15,.15,.07);rounded(knee,armored?steel:leather,0,-.27,-.025,.13,.25,.12);oval(knee,leather,0,-.51,-.045,.105,.085,.19);rounded(knee,gold,0,-.32,-.087,.09,.03,.025,.01);return l;});
 // Sculpted head, visible irises, brows and swept hair create an actual face.
 const head=new THREE.Group();head.position.y=1.73;body.add(head);mesh(body,new THREE.CylinderGeometry(.065,.07,.17,12),skin,0,1.61,0);
 oval(head,skin,0,.06,0,.145,.205,.125);oval(head,skin,0,-.05,-.034,.113,.12,.1);
 for(const side of [-1,1]){oval(head,skin,side*.145,.035,.005,.025,.056,.026);oval(head,ivory,side*.058,.065,-.116,.041,.029,.016);oval(head,eye,side*.058,.065,-.13,.022,.025,.006);oval(head,dark,side*.058,.064,-.136,.009,.019,.004);oval(head,ivory,side*.065,.075,-.14,.006,.008,.003);tube(head,dark,[[side*.095,.105,-.11],[side*.065,.115,-.125],[side*.03,.108,-.123]],.006);}
 oval(head,skin,0,.011,-.124,.016,.028,.025);tube(head,material("#a56960"),[[-.025,-.065,-.115],[0,-.071,-.12],[.023,-.065,-.115]],.004);
 oval(head,hair,0,.17,.025,.16,.11,.135);
 for(let i=0;i<7;i++){const x=(i-3)*.043;const strand=mesh(head,new THREE.ConeGeometry(.033,.18,8),hair,x,.12,-.1);strand.rotation.z=(i-3)*-.12;strand.rotation.x=Math.PI;}
 for(const side of [-1,1])tube(head,hair,[[side*.135,.16,0],[side*.15,.06,-.015],[side*.14,-.07,-.01]],.026);
 if(appearance.hair==="braid"||cls==="Warden")for(let i=0;i<9;i++)oval(head,hair,.08+Math.sin(i*2)*.014,.1-i*.065,.13,.031,.046,.038);
 if(appearance.accessory==="circlet"||cls==="Warden")tube(head,gold,[[-.15,.14,0],[-.1,.14,-.12],[0,.12,-.145],[.1,.14,-.12],[.15,.14,0]],.009);
 if(appearance.accessory==="earring")mesh(head,new THREE.TorusGeometry(.027,.006,5,12),gold,.155,-.01,-.01);
 if(tank){oval(head,steel,0,.18,.015,.177,.135,.15);rounded(head,gold,0,.2,-.125,.025,.2,.04,.01);for(const side of [-1,1])rounded(head,steel,side*.14,-.015,-.015,.05,.17,.14);}
 if(rogue){const hood=mesh(head,new THREE.SphereGeometry(.19,20,12,0,Math.PI*2,0,Math.PI*.68),cloth,0,.07,.06);hood.rotation.x=.25;tube(head,gold,[[-.17,.1,-.04],[-.13,.21,-.12],[0,.27,-.12],[.13,.21,-.12],[.17,.1,-.04]],.009);}
 if(cls==="Spellweaver"){const hat=mesh(head,new THREE.ConeGeometry(.20,.29,24),cloth,0,.365,.015);hat.rotation.z=-.18;mesh(head,new THREE.CylinderGeometry(.28,.29,.025,32),cloth,0,.235,.01);tube(head,gold,[[-.16,.28,-.02],[0,.29,-.14],[.15,.29,-.03]],.011);}
 const elbows:THREE.Group[]=[];
 const arms=[-1,1].map(side=>{const a=new THREE.Group();a.position.set(side*.26*width,1.49,0);body.add(a);a.rotation.z=side*.08;oval(a,armored?steel:cloth,0,-.005,0,rogue?.075:.13*width,tank?.14:.1,rogue?.085:.135);if(armored){tube(a,gold,[[-.09,.035,-.08],[0,.07,-.12],[.09,.035,-.08]],.012);rounded(a,steel,0,-.09,-.02,.18,.11,.17);}
 mesh(a,new THREE.CapsuleGeometry(.065,.15,4,10),cloth,0,-.16,0);const elbow=new THREE.Group();elbow.position.set(0,-.3,0);a.add(elbow);elbows.push(elbow);mesh(elbow,new THREE.CapsuleGeometry(.055,.16,4,10),caster?cloth:leather,0,-.11,0);rounded(elbow,armored?steel:leather,0,-.13,-.05,.095,.15,.06);oval(elbow,skin,0,-.26,-.005,.06,.075,.035);for(let i=0;i<3;i++)mesh(elbow,new THREE.CapsuleGeometry(.011,.047,3,6),skin,-.022+i*.021,-.31,-.007);return a;});
 const equipped=preview||!!appearance.weapon;
 if(equipped&&!caster){const hand=elbows[1];rounded(hand,leather,0,-.28,-.10,.04,.045,.19,.01);rounded(hand,gold,0,-.28,-.18,.21,.035,.03,.009);const blade=rounded(hand,steel,0,-.28,rogue?-.36:-.52,.045,.015,rogue?.32:.66,.005);blade.rotation.z=.035;
 if(tank||cls==="Knight"){const shape=new THREE.Shape();shape.moveTo(-.2,.27);shape.quadraticCurveTo(-.27,.05,-.14,-.21);shape.lineTo(0,-.35);shape.lineTo(.14,-.21);shape.quadraticCurveTo(.27,.05,.2,.27);shape.closePath();const shield=mesh(elbows[0],new THREE.ExtrudeGeometry(shape,{depth:.05,bevelEnabled:true,bevelSize:.017,bevelThickness:.012,bevelSegments:2,steps:1}),tank?steel:cloth,0,-.08,-.12);shield.rotation.y=Math.PI;rounded(elbows[0],gold,0,-.08,-.19,.035,.4,.02,.005);rounded(elbows[0],gold,0,-.035,-.19,.28,.025,.02,.005);}}
 if(equipped&&caster){const hand=elbows[1];mesh(hand,new THREE.CylinderGeometry(.02,.027,1.5,12),leather,0,.15,-.1);const crystal=mesh(hand,new THREE.OctahedronGeometry(.095,1),material(CLASSES[cls].color,0,true),0,.94,-.1);crystal.rotation.z=.3;for(const side of [-1,1])tube(hand,gold,[[side*.01,.75,-.1],[side*.10,.86,-.1],[side*.08,1.02,-.1]],.012);}
 // A curved, pleated cloak is deformed in place, rather than rotating a flat card.
 const capeGeo=new THREE.PlaneGeometry(tank?.72:.58,caster?1.1:.86,12,16),pos=capeGeo.attributes.position;const rest=new Float32Array(pos.array);for(let i=0;i<pos.count;i++){const y=pos.getY(i),x=pos.getX(i);pos.setZ(i,.08+Math.abs(x)*.18+Math.pow(.5-y,2)*.06);}const capeMat=cloth.clone();capeMat.side=THREE.DoubleSide;materials.push(capeMat);const cape=mesh(body,capeGeo,capeMat,0,1.07,.18);cape.rotation.x=.08;
 group.userData.appearance=[appearance.weapon,appearance.hair,appearance.accessory].join("|");
 return {group,left:legs[0],right:legs[1],arm:arms[1],cape,
 animate(time:number,movement:number,attack=0,dash=0,reduced=false){const t=reduced?0:time,walk=reduced?0:movement;body.position.y=Math.sin(t*2)*.008+Math.abs(Math.sin(t*10))*walk*.025;body.rotation.y=Math.sin(t*10)*walk*.045;body.rotation.x=dash*-.2;head.rotation.y=Math.sin(t*.7)*.04;
 legs.forEach((leg,i)=>{const stride=Math.sin(t*10+i*Math.PI)*walk;leg.rotation.x=stride*.55;knees[i].rotation.x=Math.max(0,-stride)*.7;});arms.forEach((a,i)=>{a.rotation.x=-Math.sin(t*10+i*Math.PI)*walk*.35;elbows[i].rotation.x=-.1-Math.abs(Math.sin(t*10))*walk*.15;});
 arms[1].rotation.x+=attack*(caster?-1.35:-.9);arms[1].rotation.z=.08+attack*(caster?-.2:-.65);elbows[1].rotation.x-=attack*.65;if(caster)arms[0].rotation.x-=attack*.55;
 if(tank){arms[0].rotation.x-=attack*.8;arms[0].rotation.z-=attack*.25;body.rotation.x-=attack*.08;}
 if(rogue){body.rotation.x-=attack*.22;body.rotation.y+=attack*.3;legs[0].rotation.x-=attack*.3;}
 if(cls==="Warden"){arms[0].rotation.z-=attack*.4;arms[1].rotation.z+=attack*.4;}
 for(let i=0;i<pos.count;i++){const x=rest[i*3],y=rest[i*3+1],height=caster?1.1:.86,factor=(height/2-y)/height;pos.setX(i,x*(.7+factor*.45));pos.setY(i,y+Math.pow(factor,5)*Math.abs(x)*.18+Math.sin(t*3+x*8)*factor*.008);pos.setZ(i,.08+Math.abs(x)*.18+Math.pow(.5-y,2)*.06+Math.sin(t*3+x*10-y*5)*factor*.045+walk*factor*.16);}pos.needsUpdate=true;capeGeo.computeVertexNormals();
 },dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
