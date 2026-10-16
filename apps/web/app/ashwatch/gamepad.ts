import {stick,turnRate} from "./controls.ts";

type Pad={index:number;connected:boolean;mapping:string;axes:readonly number[];buttons:readonly {pressed:boolean}[]};
const idle=()=>({x:0,y:0,turn:0,attack:false,skill:false,dodge:false,interact:false,warn:false,focus:false,menu:false,map:false,runToggle:false});
// Sample the latest standard-mapped device every frame. Button actions are edges;
// combat must be released after a menu, blur, disconnect, or device replacement.
export class GamepadInput {
 private index=-1;
 private previous:boolean[]=[];
 private armed=false;
 reset(){this.armed=false;}
 sample(pad:Pad|null,enabled:boolean,sensitivity:number,dt:number){
  const result=idle();
  if(!pad?.connected||pad.mapping!=="standard"){this.index=-1;this.previous=[];this.armed=false;return result;}
  const buttons=pad.buttons.map(b=>b.pressed);
  if(this.index!==pad.index){this.index=pad.index;this.previous=buttons;this.armed=false;}
  const edge=(i:number)=>!!buttons[i]&&!this.previous[i];
  result.menu=edge(9);result.map=enabled&&edge(8);
  if(!enabled)this.armed=false;
  else if(!buttons[0]&&!buttons[1]&&!buttons[2]&&!buttons[3]&&!buttons[5]&&!buttons[7])this.armed=true;
  if(enabled&&this.armed&&!result.menu&&!result.map){
   const axis=(i:number)=>Number.isFinite(pad.axes[i])?pad.axes[i]:0;
   const move=stick(axis(0),axis(1));result.x=move.x;result.y=move.y;
   result.turn=turnRate(stick(axis(2),0,1,.18).x,sensitivity,dt);
   result.attack=!!buttons[2]||!!buttons[7];result.skill=edge(3);result.dodge=edge(0)||edge(1);result.interact=edge(4);result.warn=edge(5);result.focus=edge(11);result.runToggle=edge(10);
  }
  this.previous=buttons;return result;
 }
}
