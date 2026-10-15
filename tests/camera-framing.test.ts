import test from "node:test";
import assert from "node:assert/strict";
import {combatFraming} from "../apps/web/app/ashwatch/camera-framing.ts";
import {cameraRig,damping} from "../apps/web/app/ashwatch/controls.ts";

test("close framing clears the scout's face above a heavy adventurer without hiding the adventurer",()=>{
 const heavy={height:1.28,width:1.5},rig=cameraRig(20),spacing=46*.04,frame=combatFraming(heavy,spacing,false);
 const rayHeight=1.65+(rig.height+frame.lift-1.65)*spacing/(rig.distance+spacing);
 const lateral=frame.shoulder*spacing/(rig.distance+spacing);
 assert.ok(rayHeight>2.3,'the sightline passes above the heavy shoulders');
 assert.ok(lateral>.25,'the sightline passes beside the heavy helmet');
 assert.ok(frame.lift<1.5,'retain an elevated third-person view, not an overhead jump');
});
test("missing, distant and invalid target distances do not trigger close combat reframing",()=>{
 const size={height:1,width:1},idle=combatFraming(size,undefined,false);
 for(const d of [4,10,Infinity,NaN])assert.deepEqual(combatFraming(size,d,false),idle);
 assert.ok(combatFraming(size,1.2,false).lift>idle.lift);
});
test("framing changes continuously and the same bounded transition settles across frame rates",()=>{
 const size={height:1.28,width:1.5};assert.ok(Math.abs(combatFraming(size,4,false).lift-combatFraming(size,3.999,false).lift)<.001);
 const wanted=combatFraming(size,1.2,true);for(const fps of [30,60,120]){let lift=0;for(let i=0;i<fps;i++)lift+=(wanted.lift-lift)*damping(5,1/fps);assert.ok(Math.abs(lift-wanted.lift)<.02);}
 assert.ok(wanted.shoulder<combatFraming(size,1.2,false).shoulder);
});
