// A short input grace period makes a deliberate press survive an existing recovery.
// It only repeats requests; the server still decides whether an action can begin.
export class SkillIntent {
  private until = 0;
  press(now: number) { this.until = now + 600; }
  reset() { this.until = 0; }
  requested(now: number, cooldown: number, skillActive = false) {
    if (cooldown > 0 || skillActive || now >= this.until) this.reset();
    return this.until > now;
  }
}
