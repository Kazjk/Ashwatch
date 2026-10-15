import { simulation } from "@ashwatch/simulation";
import type { Request } from "@ashwatch/protocol";
const MAX_INTENTS_PER_SECOND = 30;

export class GameService {
  private readonly intentWindows = new Map<
    string,
    { startedAt: number; count: number }
  >();
  private readonly now: () => number;

  constructor(now = Date.now) {
    this.now = now;
  }

  handle(request: Request) {
    if (request.action === "intent") this.enforceIntentRate(request.token);
    switch (request.action) {
      case "create":
        return simulation.create(request.name ?? "", request.heroClass);
      case "join":
        return simulation.join(
          request.room,
          request.name ?? "",
          request.heroClass,
        );
      case "ready":
        return simulation.ready(
          request.room,
          request.player,
          request.token,
          request.ready,
        );
      case "start":
        return simulation.start(request.room, request.player, request.token);
      case "replay":
        return simulation.replay(request.room, request.player, request.token);
      case "intent":
        return simulation.intent(
          request.room,
          request.player,
          request.token,
          request.intent,
        );
    }
  }

  private enforceIntentRate(token: string) {
    const now = this.now();
    const current = this.intentWindows.get(token);
    if (!current && this.intentWindows.size >= 1_024) {
      for (const [credential, window] of this.intentWindows) {
        if (now - window.startedAt >= 1_000)
          this.intentWindows.delete(credential);
      }
      if (this.intentWindows.size >= 1_024) throw new Error("RATE_LIMITED");
    }
    if (!current || now - current.startedAt >= 1_000) {
      this.intentWindows.set(token, { startedAt: now, count: 1 });
      return;
    }
    current.count += 1;
    if (current.count > MAX_INTENTS_PER_SECOND) throw new Error("RATE_LIMITED");
  }
}

const service = new GameService();
export const handle = service.handle.bind(service);
export const snapshot = simulation.snapshot.bind(simulation);
