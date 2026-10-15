import type { WorldView } from "./world.ts";

// Original synthesized cues. No external audio assets or location-bearing rear sounds.
export class Feedback {
  private context: AudioContext | null = null;
  private previous: WorldView | null = null;
  private seen = 0;
  private enabled = false;
  private volume = .5;
  private voices = new Map<OscillatorNode,GainNode>();
  setVolume(value:number){this.volume=Number.isFinite(value)?Math.max(0,Math.min(1,value)):.5;if(this.volume===0)this.clearVoices();}
  private clearVoices(){for(const [voice,gain] of this.voices){voice.onended=null;try{voice.stop();}catch{}voice.disconnect();gain.disconnect();}this.voices.clear();}
  suspend(){this.clearVoices();void this.context?.suspend().catch(()=>{});}
  enable(enabled: boolean) {
    const changed=this.enabled!==enabled;
    this.enabled = enabled;
    if(!enabled)this.clearVoices();
    if (enabled) {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
      if(changed)this.tone(420, 0.09, "sine", 600);
    }
  }
  private tone(frequency: number, duration: number, type: OscillatorType = "sine", end = frequency) {
    if (!this.enabled || !this.volume || !this.context || this.context.state !== "running" || this.voices.size>=5) return;
    const context = this.context, at = context.currentTime;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,end), at + duration);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.045*this.volume, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain);gain.connect(context.destination);
    this.voices.set(oscillator,gain);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();this.voices.delete(oscillator);};
    oscillator.start(at);oscillator.stop(at + duration);
  }
  update(view: WorldView) {
    if(this.previous&&(this.previous.selfId!==view.selfId||this.previous.watch?.startedAt!==view.watch?.startedAt)){this.previous=null;this.seen=0;this.clearVoices();}
    const me=view.heroes.find(p=>p.id===view.selfId);
    const old=this.previous?.heroes.find(p=>p.id===view.selfId);
    if(old&&me){
      if(me.hp<old.hp)this.tone(100,0.16,"triangle",45);
      else if(me.level>old.level||view.cleared.length>(this.previous?.cleared.length??0))this.tone(520,0.35,"sine",1040);
      if(me.dodgeAt>old.dodgeAt)this.tone(240,0.12,"sine",80);
      // Snapshot events are repeated by the server: play each only once, never on resume.
      const fresh=view.effects.filter(e=>e.id>this.seen);
      const contact=me.action?.resolved&&old.action?.at===me.action.at&&!old.action.resolved;
      const began=me.action&&!me.action.resolved&&old.action?.at!==me.action.at;
      if(fresh.some(e=>e.kind==="parry"))this.tone(860,.1,"triangle",1280);
      else if(fresh.some(e=>e.kind==="interrupt"||e.kind==="backstab"))this.tone(610,.12,"triangle",260);
      else if(fresh.some(e=>e.kind==="cover"))this.tone(530,.18,"sine",1060);
      else if(fresh.some(e=>e.kind==="cleanse"))this.tone(660,.2,"sine",1320);
      else if(fresh.some(e=>e.kind==="ward"))this.tone(160,.28,"sine",320);
      else if(contact){
        if(!me.action!.hit)this.tone(260,.055,"sine",150);
        else if(me.heroClass==="Spellweaver")this.tone(me.action!.skill?420:330,me.action!.skill?.20:.12,"sine",me.action!.skill?1250:660);
        else if(me.heroClass==="Warden")this.tone(me.action!.skill?440:350,me.action!.skill?.22:.10,"sine",me.action!.skill?880:630);
        else if(me.heroClass==="Ironbound")this.tone(95,.16,"triangle",40);
        else if(me.heroClass==="Rogue")this.tone(310,.065,"triangle",90);
        else this.tone(180,.09,"triangle",65);
      }
      else if(began){
        if(me.heroClass==="Spellweaver")this.tone(260,.19,"sine",400);
        else if(me.heroClass==="Warden")this.tone(360,.17,"sine",510);
        else if(me.heroClass==="Ironbound")this.tone(90,.14,"triangle",65);
        else if(me.heroClass==="Rogue")this.tone(330,.045,"triangle",450);
        else this.tone(150,.065,"triangle",105);
      }
      else if(fresh.some(e=>e.kind==="starfall"))this.tone(420,.20,"sine",1250);
      else if(fresh.some(e=>e.kind==="hit"&&e.value)&&me.hp>=old.hp)this.tone(180,0.075,"triangle",70);
      else if(fresh.some(e=>e.kind==="slash"||e.kind==="crescent"))this.tone(380,0.08,"sine",130);
      else if(fresh.some(e=>e.kind==="spell"))this.tone(330,0.12,"sine",660);
      else if(fresh.some(e=>e.kind==="heal"))this.tone(440,0.22,"sine",880);
    }
    this.seen=Math.max(this.seen,...view.effects.map(e=>e.id));
    this.previous=view;
  }
  dispose(){this.clearVoices();void this.context?.close().catch(()=>{});this.context=null;this.previous=null;this.seen=0;this.enabled=false;}
}
