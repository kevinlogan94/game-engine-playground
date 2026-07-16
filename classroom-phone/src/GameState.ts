import type { ReplyOption, ThreadMessage } from "./PhoneOverlay";
import type { SeatId } from "./gameConfig";
import { seatWorld } from "./gameConfig";

export interface Classmate {
  id: string;
  name: string;
  spriteKey: string;
  seat: SeatId;
  x: number;
  y: number;
  friendship: number;
  /** Prior back-and-forth, ending with their newest inbound text */
  thread: ThreadMessage[];
  replies: ReplyOption[];
}

function seated(
  id: string,
  name: string,
  spriteKey: string,
  seat: SeatId,
  thread: ThreadMessage[],
  replies: ReplyOption[],
): Classmate {
  const { x, y } = seatWorld(seat);
  return { id, name, spriteKey, seat, x, y, friendship: 0, thread, replies };
}

export class GameState {
  private classmates: Map<string, Classmate> = new Map();

  constructor() {
    this.classmates.set(
      "alice",
      seated(
        "alice",
        "Alice",
        "alice",
        "L0",
        [
          { from: "them", text: "ok so #2 was fine but #3 is cursed" },
          { from: "me", text: "lmao which part" },
          { from: "them", text: "the graph one. my slope is a crime" },
          { from: "me", text: "send a pic later" },
          {
            from: "them",
            text: "psst… did you finish the homework? I'm stuck on #3 😅",
          },
        ],
        [
          {
            id: "help",
            label: "Yeah — I can walk you through it",
            friendshipDelta: 2,
          },
          {
            id: "kinda",
            label: "Kinda… want to compare notes?",
            friendshipDelta: 1,
          },
          {
            id: "cold",
            label: "Lol no, figure it out",
            friendshipDelta: -1,
          },
        ],
      ),
    );

    this.classmates.set(
      "bob",
      seated(
        "bob",
        "Bob",
        "bob",
        "R0",
        [
          { from: "them", text: "that lecture was rough" },
          { from: "me", text: "bro I zoned out at slide 4" },
          { from: "them", text: "same. I need food immediately" },
          {
            from: "them",
            text: "Hey! Lunch later? There's a new burrito place.",
          },
        ],
        [
          {
            id: "yes",
            label: "I'm in — save me a seat",
            friendshipDelta: 2,
          },
          {
            id: "maybe",
            label: "Maybe if class ends early",
            friendshipDelta: 1,
          },
          {
            id: "busy",
            label: "Can't today, sorry",
            friendshipDelta: 0,
          },
        ],
      ),
    );

    this.classmates.set(
      "charlie",
      seated(
        "charlie",
        "Charlie",
        "charlie",
        "R1",
        [
          { from: "me", text: "yo is she pairing us up" },
          { from: "them", text: "wait what" },
          { from: "me", text: "look at the board" },
          {
            from: "them",
            text: "Did you see that? The teacher just assigned a group project 😬",
          },
        ],
        [
          {
            id: "team",
            label: "Want to be partners?",
            friendshipDelta: 2,
          },
          {
            id: "nervous",
            label: "Ugh… we'll survive",
            friendshipDelta: 1,
          },
          {
            id: "ignore_tone",
            label: "Not my problem",
            friendshipDelta: -1,
          },
        ],
      ),
    );
  }

  getClassmate(id: string): Classmate | undefined {
    return this.classmates.get(id);
  }

  getAllClassmates(): Classmate[] {
    return Array.from(this.classmates.values());
  }

  addFriendship(id: string, amount: number): void {
    const classmate = this.classmates.get(id);
    if (classmate) {
      classmate.friendship += amount;
    }
  }

  getFriendship(id: string): number {
    return this.classmates.get(id)?.friendship ?? 0;
  }
}
