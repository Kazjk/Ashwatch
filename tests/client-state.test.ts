import test from "node:test";
import assert from "node:assert/strict";
import {ResponseOrder,nextSequence,repeatStrike} from "../apps/web/app/ashwatch/client-state.ts";
test("an older poll cannot overwrite a later service snapshot",()=>{const order=new ResponseOrder();assert.ok(order.accept(1));assert.ok(order.accept(3));assert.equal(order.accept(2),false);assert.equal(order.accept(NaN),false);assert.ok(order.accept(4));});

test("input sequences catch up after a newer tab and remain monotonic when the clock stalls",()=>{assert.equal(nextSequence(100,10000),10000);assert.equal(nextSequence(10000,9999),10001);assert.ok(nextSequence(100,12000)>nextSequence(100,11000));});

test("a first strike remains deliberate while held repetition waits for visible reach",()=>{
 assert.equal(repeatStrike(true,false,false),true);assert.equal(repeatStrike(false,true,false),false);assert.equal(repeatStrike(false,true,true),true);assert.equal(repeatStrike(false,false,true),false);
});
