export class ResponseOrder {
  private latest = 0;

  accept(requestNumber: number) {
    if (!Number.isSafeInteger(requestNumber) || requestNumber < this.latest)
      return false;
    this.latest = requestNumber;
    return true;
  }
}

export const nextSequence=(previous:number,now=Date.now())=>Math.max(previous+1,now);

// An explicit press may whiff; repetition waits for a recipient-visible target in reach.
export const repeatStrike=(pressed:boolean,held:boolean,inReach:boolean)=>pressed||held&&inReach;

