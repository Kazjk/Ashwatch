import { BUILDINGS, FLOOR_COLORS, GATE, NEST, VILLAGE, distance, type Hero, type WorldView, type MonsterView } from "./world";
type C = CanvasRenderingContext2D;
const noise=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
function ellipse(c:C,x:number,y:number,rx:number,ry:number,color:string){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function poly(c:C,points:number[][],fill:string,stroke?:string){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function line(c:C,x:number,y:number,xx:number,yy:number,color:string,width:number){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();}
function label(c:C,text:string,x:number,y:number,color="#f4eed7",size=12){c.font=`${size}px Georgia`;c.textAlign="center";c.fillStyle="#15252ed9";c.fillText(text,x+1,y+2);c.fillStyle=color;c.fillText(text,x,y);}
function tree(c:C,x:number,y:number,scale:number,seed:number,time:number,autumn=false){
  c.save();c.translate(x,y);c.scale(scale,scale);const sway=Math.sin(time/2100+seed)*2;
  ellipse(c,18,12,42,18,"#0b292e36");
  poly(c,[[-7,10],[7,10],[5,-45],[-3,-70],[-9,-27]],"#6e5745");
  line(c,0,-18,-23,-43,"#725c47",5);
  c.translate(sway,0);
  const colors=autumn?["#834c64","#bd6580","#e79799"]:["#214e50","#33756a","#65a184"];
  for(let i=0;i<5;i++){const xx=Math.cos(i*2.4)*22,yy=-52+Math.sin(i*2.4)*16;ellipse(c,xx,yy,29,24,colors[0]);ellipse(c,xx-4,yy-7,25,21,colors[1]);ellipse(c,xx-9,yy-13,14,11,colors[2]);}
  c.restore();
}
function rock(c:C,x:number,y:number,s:number){c.save();c.translate(x,y);c.scale(s,s);ellipse(c,6,4,26,13,"#132b3536");poly(c,[[-24,0],[-18,-25],[0,-36],[23,-23],[29,1],[4,12]],"#607e7b","#3e6265");poly(c,[[-18,-25],[0,-36],[23,-23],[2,-13]],"#a2b4a0");c.restore();}
function house(c:C,x:number,y:number,s:number,damage:number,time:number){
 c.save();c.translate(x,y);c.scale(s,s);ellipse(c,25,16,83,27,"#18313a44");
 poly(c,[[-58,4],[-58,-65],[58,-65],[58,4]],"#e5cf9b","#614e42");
 poly(c,[[58,4],[85,-13],[85,-77],[58,-65]],"#b19d79","#614e42");
 for(const xx of [-47,0,47])line(c,xx,-58,xx,2,"#715442",6);
 line(c,-56,-20,56,-20,"#715442",5);
 poly(c,[[-76,-55],[0,-117],[81,-55]],"#38566a","#203948");
 poly(c,[[0,-117],[25,-131],[98,-73],[81,-55]],"#527b89","#203948");
 for(let i=0;i<4;i++)line(c,-60+i*13,-64-i*12,63-i*13,-64-i*12,"#668b91",2);
 c.fillStyle="#543e37";c.fillRect(-12,-34,24,39);ellipse(c,-1,-34,12,11,"#543e37");
 for(const xx of [-36,31]){c.fillStyle="#ffdc8d";c.fillRect(xx-8,-46,16,17);line(c,xx,-46,xx,-29,"#78624e",2);}
 poly(c,[[34,-105],[34,-138],[49,-138],[49,-91]],"#9c8c79","#4a5050");
 if(damage>20){for(let i=0;i<4;i++){const a=time/650+i;ellipse(c,Math.sin(a)*8+i*9-15,-70-(time/35+i*18)%70,12,24,"#ee8c4577");ellipse(c,i*12-20,-60,9,18,"#ffc267");}}
 else for(let i=0;i<3;i++)ellipse(c,42+Math.sin(time/1800+i)*7,-145-(time/90+i*20)%60,8+i*3,6+i*4,"#e6e1c232");
 c.restore();
}
function gate(c:C,x:number,y:number,time:number,open=true){
 c.save();c.translate(x,y);ellipse(c,0,0,70,26,"#a9dadb21");
 for(const side of [-1,1]){c.fillStyle="#465b62";c.fillRect(side*47-13,-112,26,118);c.strokeStyle="#8c9c93";c.lineWidth=2;c.strokeRect(side*47-13,-112,26,118);for(let j=0;j<5;j++)line(c,side*47-13,-j*24,side*47+13,-j*24,"#293e4b",2);}
 poly(c,[[-62,-100],[-30,-138],[30,-138],[62,-100],[37,-93],[16,-113],[-16,-113],[-38,-93]],"#83908a","#3c505a");
 const g=c.createRadialGradient(0,-42,4,0,-42,67);g.addColorStop(0,open?"#a4fff3b0":"#9b6c6440");g.addColorStop(1,"#6fe2e800");c.fillStyle=g;c.fillRect(-50,-114,100,125);
 for(let i=0;i<12;i++){const a=i*2.4+time/3000;ellipse(c,Math.cos(a)*27,-47+Math.sin(a*1.3)*42,1.5,2,open?"#c9fff2":"#bd7a68");}
 c.restore();
}
function hero(c:C,p:Hero,time:number,self:boolean){
 c.save();c.translate(p.x,p.y);const bob=p.moving?Math.sin(time/85)*2:Math.sin(time/650)*.6;const step=p.moving?Math.sin(time/85)*5:0;
 ellipse(c,2,4,19,8,"#0e233866");
 if(self){c.strokeStyle="#f3d898bb";c.lineWidth=1.5;c.beginPath();c.ellipse(0,4,22,10,0,0,7);c.stroke();}
 if(p.hp<=0){c.rotate(-1.3);c.globalAlpha=.6;}
 c.translate(0,bob);
 const mage=p.heroClass==="Spellweaver";
 poly(c,[[-11,-25],[-23-Math.sin(time/230)*3,1],[1,7],[16,0],[10,-26]],mage?"#9c699e":"#bd5863","#433d5a");
 line(c,-6,-8,-7+step,3,"#253d50",7);line(c,6,-8,7-step,3,"#253d50",7);
 poly(c,[[-13,-28],[12,-28],[13,-10],[0,-4],[-12,-11]],mage?"#dcd7ed":"#a5bcc5","#37495b");
 poly(c,[[-11,-27],[-4,-23],[-4,-10],[-12,-14]],mage?"#695784":"#e2ece5");
 line(c,-14,-25,-18,-11,"#d0d8d0",6);line(c,14,-25,17,-13,"#d0d8d0",6);
 ellipse(c,0,-38,10,11,"#f0cfac");
 poly(c,[[-11,-38],[-13,-48],[-8,-46],[-4,-53],[1,-49],[8,-52],[13,-44],[10,-32],[6,-42],[1,-38],[-3,-44],[-7,-37]],mage?"#ece4ec":"#344855","#253d4c");
 line(c,-5,-36,-2,-36,"#354158",1.5);line(c,3,-36,6,-36,"#354158",1.5);
 c.save();c.translate(17,-15);const attack=time-p.attackAt<330;c.rotate(attack?Math.sin((time-p.attackAt)/330*Math.PI)*2-1:.25);
 if(mage){line(c,0,10,0,-37,"#c7a276",3);poly(c,[[0,-50],[-7,-40],[0,-30],[7,-40]],"#a0f2e6","#ebfff7");}
 else{poly(c,[[-3,-3],[-3,-37],[1,-46],[5,-37],[4,-3]],"#e7f8f0","#637f8d");line(c,-8,-3,10,-3,"#e6ba78",4);line(c,1,-1,1,10,"#5d5150",4);}
 c.restore();
 if(p.dodgeUntil>time){c.strokeStyle="#c1f9fc77";c.lineWidth=2;c.beginPath();c.ellipse(0,-21,27,38,0,0,7);c.stroke();}
 c.restore();
 label(c,self?p.name:`${p.name} · ${p.level}`,p.x,p.y-65,self?"#ffe8b5":"#f2b9be",11);
 if(p.hp<p.maxHp){c.fillStyle="#152633";c.fillRect(p.x-20,p.y-59,40,3);c.fillStyle=self?"#92d7ae":"#e98285";c.fillRect(p.x-20,p.y-59,40*p.hp/p.maxHp,3);}
}
function monster(c:C,e:MonsterView,time:number){
 c.save();c.translate(e.x,e.y);const s=e.kind==="boss"?1.8:e.kind==="sentinel"?1.3:1;c.scale(s,s);
 ellipse(c,3,4,23,9,"#09243255");
 const pulse=Math.sin(time/330+e.id.length);
 if(e.kind==="slime") {ellipse(c,0,-11,21+pulse,16-pulse,"#4c9fa3");ellipse(c,-3,-15,15,10,"#89ddc2");ellipse(c,-8,-15,4,2,"#daffdc");ellipse(c,-5,-9,2,3,"#274e61");ellipse(c,7,-9,2,3,"#274e61");}
 else if(e.kind==="wolf") {
  const flip=Math.cos(e.facing)<0?-1:1;c.scale(flip,1);
  poly(c,[[-23,-8],[-30,-23],[-13,-19],[0,-26],[18,-24],[25,-12],[17,-1],[-9,0]],"#c9c9ce","#505975");
  poly(c,[[6,-24],[8,-39],[18,-27],[26,-31],[23,-16],[32,-13],[18,-9]],"#e0e1dd","#505975");
  line(c,-13,-1,-16,8+pulse*2,"#657088",5);line(c,14,-1,12,8-pulse*2,"#657088",5);ellipse(c,21,-22,2,2,"#fba180");
 } else {
  poly(c,[[-19,-29],[-14,-7],[0,0],[18,-8],[21,-29],[5,-40]],e.kind==="boss"?"#665573":"#748481","#353f56");
  poly(c,[[-12,-30],[-10,-45],[10,-45],[14,-30],[0,-25]],"#a2a49c","#354552");
  line(c,-7,-34,8,-34,"#f8af99",3);line(c,23,-24,31,4,"#a3aba1",8);
  poly(c,[[-11,-43],[-19,-59],[-5,-48],[5,-48],[19,-59],[11,-43]],"#c5bfa2");
 }
 c.restore();
 if(e.hp<e.maxHp||e.attackAt){c.fillStyle="#233743";c.fillRect(e.x-22,e.y-65,44,4);c.fillStyle="#ee9b8d";c.fillRect(e.x-22,e.y-65,44*e.hp/e.maxHp,4);}
 if(e.kind==="boss")label(c,"FLOOR GUARDIAN",e.x,e.y-90,"#eec5d3",10);
}
function dragon(c:C,d:NonNullable<WorldView["dragon"]>,time:number){
 c.save();c.translate(d.x,d.y);const sleep=d.state==="sleeping";const beat=Math.sin(time/(sleep?1500:220));
 ellipse(c,30,20,145,53,"#18233455");c.scale(1,1+beat*.016);
 for(const side of [-1,1]){
  poly(c,[[side*20,-35],[side*95,-150-beat*12],[side*160,-91-beat*17],[side*119,-78],[side*128,-34],[side*79,-50],[side*55,0]],sleep?"#53697a":"#a56272","#34465e");
  line(c,side*20,-35,side*95,-150-beat*12,"#b6b2aa",5);line(c,side*95,-150-beat*12,side*119,-78,"#8b8290",3);
 }
 c.strokeStyle="#4d6375";c.lineWidth=29;c.lineCap="round";c.beginPath();c.moveTo(-35,-5);c.bezierCurveTo(-110,35,-137,-43,-175,-15);c.stroke();
 ellipse(c,0,-24,62,45,"#4b6374");ellipse(c,-8,-40,43,24,"#7c9393");
 for(let i=0;i<7;i++)poly(c,[[-42+i*12,-53],[-38+i*12,-73],[-28+i*12,-50]],"#d0c6aa","#536878");
 for(const side of [-1,1]){poly(c,[[side*30,-15],[side*64,7],[side*68,24],[side*34,21]],"#637d88","#354a61");for(let i=0;i<3;i++)line(c,side*40+i*8,18,side*39+i*8,28,"#ded2b7",4);}
 poly(c,[[32,-33],[66,-69],[109,-64],[125,-39],[111,-15],[74,-19]],"#7c9193","#344b63");
 poly(c,[[71,-62],[66,-104],[88,-67],[99,-66],[111,-100],[115,-52]],"#c5c7b4","#536a79");
 line(c,91,-45,105,-43,sleep?"#253f54":"#ffb976",sleep?2:5);
 if(sleep){label(c,"z",130,-84-Math.sin(time/1200)*8,"#d0e0df",21);label(c,"z",147,-109-Math.sin(time/1200)*8,"#aabcc8",14);}
 else if(d.attackAt){ellipse(c,121,-27,11+beat*4,9,"#ffd1a1");}
 c.restore();
 label(c,"VAELTHORN",d.x,d.y-183,"#e6d3ba",16);
}
export class Scene {
 private x=VILLAGE.x+100;private y=VILLAGE.y;private zoom=1.3;private floor=0;
 private positions=new Map<string,{x:number;y:number}>();
 draw(canvas:HTMLCanvasElement,view:WorldView|null,now:number,preview=false){
  const c=canvas.getContext("2d");if(!c)return;
  const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  // Smooth network snapshots without letting client prediction change authoritative combat.
  const received=(view as (WorldView & {received?:number})|null)?.received??now;
  if(view){
    const smooth=<T extends {id:string;x:number;y:number}>(p:T):T=>{const old=this.positions.get(p.id);const snap=!old||distance(old,p)>220;const next=snap?{x:p.x,y:p.y}:{x:old.x+(p.x-old.x)*.3,y:old.y+(p.y-old.y)*.3};this.positions.set(p.id,next);return {...p,...next};};
    view={...view,heroes:view.heroes.map(smooth),monsters:view.monsters.map(smooth)};
  }
  const me=view?.heroes.find(p=>p.id===view.selfId);
  const floor=me?.floor??0;
  const targetZoom=preview?.94:(w<760?1.5:1.65)*(1-(me?.awareness??0)*.0044);
  if(this.floor!==floor){this.floor=floor;this.x=me?.x??this.x;this.y=me?.y??this.y;}
  this.x+=((me?.x??1080)-this.x)*.12;this.y+=((me?.y??1390)-this.y)*.12;this.zoom+=(targetZoom-this.zoom)*.025;
  const z=this.zoom;const sy=.82;const t=view?view.time+now-received:now;
  c.fillStyle=floor?FLOOR_COLORS[floor-1]:"#668570";c.fillRect(0,0,w,h);
  c.save();c.translate(w/2,h*.55);c.scale(z,z*sy);c.translate(-this.x,-this.y);
  const on=(x:number,y:number,margin=180)=>Math.abs(x-this.x)<w/z/2+margin&&Math.abs(y-this.y)<h/(z*sy)/2+margin;
  if(!floor){
   for(let i=0;i<160;i++){const x=noise(i*3)*2400,y=noise(i*3+1)*2400;if(on(x,y))ellipse(c,x,y,50+noise(i)*100,30+noise(i+1)*55,i%3?"#93a17418":"#264d5520");}
   // Streams, banks and a winding road are painted into the world, not a grid.
   for(const [width,color] of [[126,"#8b9d82"],[102,"#3c777e"],[74,"#66a1a0"],[28,"#86bbb035"]] as const){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(1480,2450);c.bezierCurveTo(1900,1550,1170,1460,1570,1020);c.bezierCurveTo(1750,660,1250,250,1600,-80);c.stroke();}
   for(const [width,color] of [[94,"#6d8165"],[78,"#b8ad86"],[60,"#c5b794"]] as const){c.strokeStyle=color;c.lineWidth=width;c.lineCap="round";c.beginPath();c.moveTo(690,1930);c.quadraticCurveTo(1080,1480,1110,1240);c.quadraticCurveTo(1110,1050,GATE.x,GATE.y);c.stroke();}
   ellipse(c,VILLAGE.x,VILLAGE.y,215,168,"#b9ae8c");ellipse(c,VILLAGE.x,VILLAGE.y,185,144,"#c3b695");
   for(let i=0;i<95;i++){const a=noise(i+100)*7,r=noise(i+300)*180;const x=VILLAGE.x+Math.cos(a)*r,y=VILLAGE.y+Math.sin(a)*r*.8;if(on(x,y)){c.strokeStyle="#8c927b55";c.lineWidth=1;c.strokeRect(x,y,14,9);}}
   // Bridge across the creek.
   c.save();c.translate(1540,1180);c.rotate(.32);c.fillStyle="#b19b78";c.fillRect(-94,-40,188,80);for(let i=-90;i<95;i+=15)line(c,i,-40,i,40,"#756e60",2);line(c,-99,-42,99,-42,"#ddddb4",8);line(c,-99,42,99,42,"#ddddb4",8);c.restore();
   for(let i=0;i<600;i++){const x=noise(i+800)*2400,y=noise(i+1800)*2400;if(!on(x,y,30)||distance({x,y},VILLAGE)<210)continue;const color=i%9===0?"#eed8b4":i%3===0?"#b8c299":"#426958";line(c,x,y,x-2,y-5,color,1.5);if(i%9===0)ellipse(c,x,y-5,2,2,color);}
   // Sleeping dragon's rocky meadow.
   ellipse(c,NEST.x,NEST.y,230,155,"#778c7a");for(let i=0;i<9;i++){const a=i*.8;rock(c,NEST.x+Math.cos(a)*175,NEST.y+Math.sin(a)*110,1.1);}
  } else {
   c.fillStyle="#122434";c.fillRect(0,0,2400,2400);c.fillStyle=FLOOR_COLORS[floor-1];c.fillRect(630,490,1140,1340);
   for(let x=640;x<1770;x+=80)for(let y=500;y<1830;y+=80){if(!on(x,y,80))continue;c.fillStyle=noise(x+y)>.5?"#dae4d90b":"#0c243514";c.fillRect(x+2,y+2,76,76);c.strokeStyle="#d1d7c30d";c.strokeRect(x+2,y+2,76,76);}
   for(let i=0;i<60;i++){const x=680+noise(i+37)*1020,y=570+noise(i+76)*1120;if(on(x,y)){ellipse(c,x,y,30+noise(i)*40,14,floor===6?"#ee9b4928":floor===8?"#df8aab23":"#afdcba12");}}
   if([3,5,7].includes(floor))for(let i=0;i<5;i++){const x=730+i*220,y=980+Math.sin(i*3)*210;ellipse(c,x,y,85,50,floor===7?"#c6eaf82b":"#61c8d34b");}
   if(floor===6)for(let i=0;i<4;i++){line(c,700+i*250,700,750+i*250,1350,"#f9965433",14);line(c,700+i*250,700,750+i*250,1350,"#ffc575",3);}
   if(floor===2)for(let i=0;i<8;i++){c.strokeStyle="#233e37";c.lineWidth=15;c.beginPath();c.moveTo(i%2?1740:660,650+i*130);c.bezierCurveTo(1100,620+i*130,1500,670+i*130,i%2?800:1550,800+i*130);c.stroke();}
   if(floor===4){ellipse(c,1200,1110,300,300,"#dde6e814");c.strokeStyle="#ddd5cf6b";c.lineWidth=3;c.beginPath();c.arc(1200,1110,240,0,7);c.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;line(c,1200+Math.cos(a)*190,1110+Math.sin(a)*190,1200+Math.cos(a)*290,1110+Math.sin(a)*290,"#dedbd452",2);}}
   if(floor===9){c.fillStyle="#957b943b";c.fillRect(1130,710,140,850);for(let i=0;i<7;i++)poly(c,[[1200,780+i*110],[1220,800+i*110],[1200,820+i*110],[1180,800+i*110]],"#c9b1c342");}
   if(floor===10){const g=c.createRadialGradient(1200,1050,35,1200,1050,260);g.addColorStop(0,"#e8b2d300");g.addColorStop(.8,"#dfb7d519");g.addColorStop(.92,"#fad1b967");g.addColorStop(1,"#efacdc00");c.fillStyle=g;c.fillRect(900,750,600,600);ellipse(c,1200,1050,170,170,"#201f40a8");}
  }
  const objects:{y:number;draw:()=>void}[]=[];
  if(!floor){
   for(let i=0;i<260;i++){
    const x=noise(i+5)*2400,y=noise(i+1005)*2400;
    if(!on(x,y)||distance({x,y},VILLAGE)<255||distance({x,y},GATE)<150||distance({x,y},NEST)<260||Math.abs(x-(y>1250?1040:1200))<115)continue;
    objects.push({y,draw:()=>tree(c,x,y,.75+noise(i+1)*.9,i,t,i%17===0)});
   }
   for(const [x,y,s] of BUILDINGS)objects.push({y,draw:()=>house(c,x,y,s,view?.villageDamage??0,t)});
   objects.push({y:VILLAGE.y,draw:()=>{ellipse(c,VILLAGE.x,VILLAGE.y,35,19,"#738980");ellipse(c,VILLAGE.x,VILLAGE.y-5,26,13,"#91c1b1");line(c,VILLAGE.x,VILLAGE.y-8,VILLAGE.x,VILLAGE.y-37,"#dfdec0",8);ellipse(c,VILLAGE.x,VILLAGE.y-37,15,8,"#cfdbc2");}});
   objects.push({y:GATE.y,draw:()=>{rock(c,GATE.x-65,GATE.y-20,2);rock(c,GATE.x+72,GATE.y-30,2.5);gate(c,GATE.x,GATE.y,t);label(c,"THE HOLLOW SPIRE",GATE.x,GATE.y-167,"#ede3bd",14);}});
   for(let i=0;i<5;i++){const fleeing=view?.dragon?.state==="enraged"&&distance(view.dragon,VILLAGE)<500;const x=VILLAGE.x+Math.sin(t/(fleeing?900:7000)+i*3)*(fleeing?230:100),y=VILLAGE.y+Math.cos(t/(fleeing?1100:8000)+i*4)*(fleeing?170:86);objects.push({y,draw:()=>{ellipse(c,x,y,8,4,"#24424a44");poly(c,[[x-7,y],[x-5,y-18],[x+5,y-18],[x+8,y]],i%2?"#b68b76":"#778da2");ellipse(c,x,y-23,5,6,"#e3c6a3");}});}
   if(view?.dragon&&view.dragon.state!=="defeated")objects.push({y:view.dragon.y,draw:()=>dragon(c,view.dragon!,t)});
  }else{
   if(floor===5)for(let i=0;i<10;i++){const x=i%2?1610:790,y=670+Math.floor(i/2)*185;objects.push({y,draw:()=>{c.fillStyle="#756559";c.fillRect(x-38,y-50,76,55);for(let row=0;row<2;row++)for(let book=0;book<8;book++){c.fillStyle=["#94a997","#65899c","#b7a58b"][book%3];c.fillRect(x-32+book*8,y-45+row*24,5,18);}line(c,x-40,y-24,x+40,y-24,"#c0aa88",3);}});}
   if(floor===10)objects.push({y:840,draw:()=>{poly(c,[[1155,840],[1155,725],[1177,742],[1200,700],[1223,742],[1245,725],[1245,840]],"#656081","#b9a4bb");poly(c,[[1155,840],[1135,866],[1265,866],[1245,840]],"#a795aa");ellipse(c,1200,776,15,22,"#e2b1cd");}});
   for(let i=0;i<20;i++){const x=i%2?1710:690,y=590+Math.floor(i/2)*125;if(!on(x,y))continue;objects.push({y,draw:()=>{
    if([1,2,8].includes(floor))tree(c,x,y,.9,i,t,floor===8);
    else if([3,7].includes(floor)){poly(c,[[x-18,y],[x-12,y-60],[x+6,y-94],[x+26,y-20],[x+13,y+8]],floor===7?"#b0e1e3":"#72b6d0","#c4ebec");}
    else {c.fillStyle="#829397";c.fillRect(x-13,y-80,26,84);ellipse(c,x,y-80,24,11,"#a6b2a6");ellipse(c,x,y,25,10,"#5b7779");ellipse(c,x,y-95,5,10,"#ffc887");}
   }});}
   objects.push({y:650,draw:()=>gate(c,1200,650,t,view?.cleared.includes(floor))});objects.push({y:1650,draw:()=>gate(c,1200,1650,t,true)});
  }
  if(view){
   for(const e of view.monsters){if(!on(e.x,e.y))continue;
    objects.push({y:e.y,draw:()=>monster(c,e,t)});
   }
   for(const p of view.heroes)objects.push({y:p.y,draw:()=>hero(c,p,t,p.id===view.selfId)});
  }
  objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
  for(const e of view?.effects??[]){const age=(t-e.at)/1000;if(age<0||age>1)continue;c.save();c.translate(e.x,e.y-15);c.globalAlpha=Math.max(0,1-age);
   if(e.kind==="slash"){c.rotate(e.angle);c.strokeStyle="#fff0c4";c.lineWidth=7*(1-age);c.beginPath();c.arc(0,0,45+age*85,-.9,1);c.stroke();}
   else if(e.kind==="spell"){c.rotate(e.angle);ellipse(c,age*250,0,17,6,"#c8fff8");line(c,age*250-40,0,age*250,0,"#91ecf4",3);}
   else if(e.value){label(c,String(e.value),0,-25-age*45,"#ffe0ba",18);}
   else {c.strokeStyle=e.kind==="fire"?"#ffd493":"#baffeb";c.lineWidth=5;c.beginPath();c.arc(0,0,20+age*(e.kind==="fire"?175:75),0,7);c.stroke();}
   c.restore();
  }
  c.restore();
  // Floating pollen, sunlit haze and a restrained edge vignette.
  for(let i=0;i<28;i++){const x=(noise(i+98)*w+t*(.006+i%3*.003))%w,y=(noise(i+231)*h-t*.009+i*50)%h;c.globalAlpha=.2+noise(i)*.4;ellipse(c,x,y,1.2,1.2,floor?"#bfe5ef":"#fff5cd");}c.globalAlpha=1;
  const vignette=c.createRadialGradient(w/2,h/2,h*.22,w/2,h/2,Math.max(w,h)*.7);vignette.addColorStop(0,"#122b3800");vignette.addColorStop(1,"#0d1c3866");c.fillStyle=vignette;c.fillRect(0,0,w,h);
 }
}
