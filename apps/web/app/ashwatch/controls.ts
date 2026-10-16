export type Preferences={mouse:number;touch:number;controller:number;distance:number;response:number;automaticGraphics:boolean;performance:boolean;reducedMotion:boolean;sound:boolean;volume:number};
export const DEFAULTS:Preferences={mouse:.55,touch:.65,controller:.65,distance:4.8,response:6,automaticGraphics:true,performance:false,reducedMotion:false,sound:false,volume:.5};
export const PREFERENCE_KEY="ashwatch-controls-v1";
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export function parsePreferences(raw:unknown):Preferences {
 if(typeof raw==="string"){try{raw=JSON.parse(raw);}catch{raw=null;}}
 const value=raw&&typeof raw==="object"?raw as Partial<Preferences>:{};
 const numeric=(key:keyof Preferences,min:number,max:number)=>typeof value[key]==="number"&&Number.isFinite(value[key])?clamp(value[key] as number,min,max):DEFAULTS[key] as number;
 return {automaticGraphics:typeof value.automaticGraphics==="boolean"?value.automaticGraphics:!("performance" in value),volume:numeric("volume",0,1),mouse:numeric("mouse",.2,1.8),touch:numeric("touch",.2,1.8),controller:numeric("controller",.2,1.8),distance:numeric("distance",3.5,6.5),response:numeric("response",3,12),performance:typeof value.performance==="boolean"?value.performance:false,reducedMotion:typeof value.reducedMotion==="boolean"?value.reducedMotion:false,sound:typeof value.sound==="boolean"?value.sound:false};
}
export const damping=(rate:number,seconds:number)=>1-Math.exp(-rate*Math.max(0,seconds));
export const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export const followFacing=(heading:number,facing:number,response:number,seconds:number)=>heading+angleDelta(facing,heading)*damping(response*2,seconds);
// Travel is camera-relative; gameplay supplies the current independent orbit.
export function travelVector(x:number,y:number,basis:number){return {x:-y*Math.cos(basis)-x*Math.sin(basis),y:-y*Math.sin(basis)+x*Math.cos(basis)};}
export function lookDelta(pixels:number,sensitivity:number,device:"mouse"|"touch"){return clamp(pixels,-300,300)*sensitivity*(device==="mouse"?.004:.005);}
export function stick(x:number,y:number,radius=1,deadZone=.16){const length=Math.hypot(x,y)/radius;if(length<=deadZone)return {x:0,y:0};const response=Math.pow(clamp((length-deadZone)/(1-deadZone),0,1),1.35);return {x:x/Math.hypot(x,y)*response,y:y/Math.hypot(x,y)*response};}
export const turnRate=(axis:number,sensitivity:number,seconds:number)=>axis*2.2*sensitivity*Math.min(.1,Math.max(0,seconds));
export function cameraRig(awareness:number,distance=DEFAULTS.distance,frontier=false){const progress=clamp(awareness,0,100)/100;return {distance:distance+progress*1.8,height:(frontier?2.8:3.8)+progress*(frontier?1:1.2),targetHeight:1.2,fov:58};}
export type Box={min:{x:number;y:number;z:number};max:{x:number;y:number;z:number}};
export type Vec={x:number;y:number;z:number};
// Swept camera sphere against cached static bounds, using expanded-box slab tests.
export function cameraClearance(from:Vec,to:Vec,boxes:Box[],radius=.28){const d={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z};let fraction=1;
 for(const box of boxes){let near=0,far=1;for(const axis of ["x","y","z"] as const){const min=box.min[axis]-radius,max=box.max[axis]+radius;if(Math.abs(d[axis])<1e-8){if(from[axis]<min||from[axis]>max){near=2;break;}}else {const a=(min-from[axis])/d[axis],b=(max-from[axis])/d[axis];near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));}}if(near<=far&&near<=1&&far>=0)fraction=Math.min(fraction,Math.max(0,near-.025));}
 return fraction;
}

