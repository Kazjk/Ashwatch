import test from "node:test";
test("automatic graphics is the fresh default and an explicit legacy graphics choice survives",()=>{
 assert.equal(parsePreferences(null).automaticGraphics,true);
 assert.equal(parsePreferences({performance:false}).automaticGraphics,false);
 assert.equal(parsePreferences({automaticGraphics:true,performance:false}).automaticGraphics,true);
 assert.equal(parsePreferences({automaticGraphics:false,performance:true}).performance,true);
});
import assert from "node:assert/strict";
import {DEFAULTS,parsePreferences,lookDelta,stick,turnRate,damping,cameraRig,cameraClearance,travelVector} from "../apps/web/app/ashwatch/controls.ts";
test("travel keeps the captured direction while the following camera rotates",()=>{const captured=-Math.PI/2;for(const cameraNow of [captured,0,Math.PI/2]){const move=travelVector(1,0,captured);assert.ok(Math.abs(move.x-1)<1e-9);assert.ok(Math.abs(move.y)<1e-9);if(cameraNow!==captured)assert.notDeepEqual(move,travelVector(1,0,cameraNow));}const diagonal=travelVector(1,-1,.7);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-Math.SQRT2)<1e-9);});
test("saved preferences survive reload, invalid values recover, and defaults restore",()=>{assert.deepEqual(parsePreferences(JSON.stringify({...DEFAULTS,mouse:.3})),{...DEFAULTS,mouse:.3});assert.deepEqual(parsePreferences("broken"),DEFAULTS);assert.equal(parsePreferences({distance:100,mouse:NaN}).distance,6.5);assert.equal(parsePreferences({mouse:NaN}).mouse,DEFAULTS.mouse);});
test("relative look is gradual, sensitivity scales, and distance does not change rotation",()=>{assert.equal(lookDelta(100,.5,"mouse"),.2);assert.equal(lookDelta(100,1,"mouse"),.4);assert.ok(Math.abs(lookDelta(20,.5,"mouse")*5-lookDelta(100,.5,"mouse"))<1e-10);});
test("continuous turning and exponential damping agree at 30 and 120 fps",()=>{assert.ok(Math.abs(turnRate(1,.55,1/30)*30-turnRate(1,.55,1/120)*120)<1e-10);assert.ok(Math.abs((1-damping(6,1/30))**30-(1-damping(6,1/120))**120)<1e-10);});
test("movement has a forgiving deadzone, gradual response and bounded diagonals",()=>{assert.deepEqual(stick(5,0,48),{x:0,y:0});assert.ok(stick(20,0,48).x<.3);assert.ok(Math.abs(Math.hypot(...Object.values(stick(100,100,48)))-1)<1e-10);});
test("awareness lifts and backs the camera; buildings constrain the swept camera volume",()=>{assert.ok(cameraRig(100).distance>cameraRig(0).distance);assert.ok(cameraRig(100).height>cameraRig(0).height);const box={min:{x:2,y:0,z:-1},max:{x:3,y:4,z:1}};assert.ok(cameraClearance({x:0,y:1,z:0},{x:5,y:1,z:0},[box])<.4);assert.equal(cameraClearance({x:0,y:5,z:0},{x:5,y:5,z:0},[box]),1);assert.equal(cameraClearance({x:0,y:1,z:0},{x:0,y:1,z:5},[box]),1);});
