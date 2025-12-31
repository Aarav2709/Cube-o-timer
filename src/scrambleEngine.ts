import {
  PuzzleId,
  Scramble,
  ScrambleRequest,
  Scrambler,
  WcaEventId,
} from "./types";
import { Prng, SeedInput, combineSeeds, createPrng } from "./rng";

function resolvePrng(puzzleId: PuzzleId, seed?: SeedInput): Prng {
  const effectiveSeed =
    seed !== undefined
      ? combineSeeds(puzzleId, seed)
      : combineSeeds(puzzleId, Date.now(), Math.random());
  return createPrng(effectiveSeed);
}

function axisKey(move: string): string {
  // First alphabetical letter serves as axis key (e.g., Rw -> R).
  const match = move.match(/[A-Za-z]/);
  return match ? match[0].toUpperCase() : move;
}

function generateMoveSequence(
  prng: Prng,
  moves: readonly string[],
  length: number,
): string[] {
  const seq: string[] = [];
  let lastAxis = "";
  for (let i = 0; i < length; i++) {
    let move: string;
    let attempts = 0;
    do {
      move = prng.choice(moves);
      attempts++;
    } while (axisKey(move) === lastAxis && attempts < 10);
    seq.push(move);
    lastAxis = axisKey(move);
  }
  return seq;
}

const genericMoves = [
  "R",
  "R'",
  "R2",
  "U",
  "U'",
  "U2",
  "F",
  "F'",
  "F2",
  "L",
  "L'",
  "L2",
  "D",
  "D'",
  "D2",
  "B",
  "B'",
  "B2",
];

const genericScrambler: Scrambler = {
  puzzleId: "generic",
  generate: (request: ScrambleRequest): Scramble => {
    const prng = resolvePrng(request.puzzleId, request.seed);
    const length = request.lengthHint ?? 20;
    const notation = generateMoveSequence(prng, genericMoves, length).join(" ");
    return {
      puzzleId: request.puzzleId,
      notation,
      seed: request.seed,
      state: { kind: "random-move", length },
    };
  },
};

function makeNxNScrambler(
  puzzleId: WcaEventId,
  moves: readonly string[],
  length: number,
): Scrambler {
  return {
    puzzleId,
    generate: (request: ScrambleRequest): Scramble => {
      const prng = resolvePrng(puzzleId, request.seed);
      const notation = generateMoveSequence(
        prng,
        moves,
        request.lengthHint ?? length,
      ).join(" ");
      return {
        puzzleId,
        notation,
        seed: request.seed,
        state: { kind: "random-move", length: request.lengthHint ?? length },
      };
    },
  };
}

const scrambler222 = makeNxNScrambler(
  "222",
  ["R", "R'", "R2", "U", "U'", "U2", "F", "F'", "F2"],
  9,
);

const scrambler333 = makeNxNScrambler(
  "333",
  [
    "R",
    "R'",
    "R2",
    "L",
    "L'",
    "L2",
    "U",
    "U'",
    "U2",
    "D",
    "D'",
    "D2",
    "F",
    "F'",
    "F2",
    "B",
    "B'",
    "B2",
  ],
  21,
);

const wideMoves4 = [
  "R",
  "R'",
  "R2",
  "L",
  "L'",
  "L2",
  "U",
  "U'",
  "U2",
  "D",
  "D'",
  "D2",
  "F",
  "F'",
  "F2",
  "B",
  "B'",
  "B2",
  "Rw",
  "Rw'",
  "Rw2",
  "Lw",
  "Lw'",
  "Lw2",
  "Uw",
  "Uw'",
  "Uw2",
  "Dw",
  "Dw'",
  "Dw2",
  "Fw",
  "Fw'",
  "Fw2",
  "Bw",
  "Bw'",
  "Bw2",
];

const scrambler444 = makeNxNScrambler("444", wideMoves4, 40);

const wideMoves5 = [
  ...wideMoves4,
  "3Rw",
  "3Rw'",
  "3Rw2",
  "3Uw",
  "3Uw'",
  "3Uw2",
];
const scrambler555 = makeNxNScrambler("555", wideMoves5, 60);

const wideMoves6 = [
  ...wideMoves5,
  "2Rw",
  "2Rw'",
  "2Rw2",
  "2Uw",
  "2Uw'",
  "2Uw2",
];
const scrambler666 = makeNxNScrambler("666", wideMoves6, 80);

const wideMoves7 = [
  ...wideMoves6,
  "3Rw",
  "3Rw'",
  "3Rw2",
  "3Uw",
  "3Uw'",
  "3Uw2",
  "3Fw",
  "3Fw'",
  "3Fw2",
];
const scrambler777 = makeNxNScrambler("777", wideMoves7, 100);

const pyraminxFaces = ["R", "L", "U", "B"] as const;
const pyraminxTips = ["r", "l", "u", "b"] as const;

const scramblerPyraminx: Scrambler = {
  puzzleId: "pyram",
  generate: (request: ScrambleRequest): Scramble => {
    const prng = resolvePrng("pyram", request.seed);
    const faceMoves = pyraminxFaces.flatMap((f) => [f, `${f}'`]);
    const tipMoves = pyraminxTips.flatMap((t) => [t, `${t}'`]);
    const mainLength = request.lengthHint ?? 11;
    const main = generateMoveSequence(prng, faceMoves, mainLength);
    // Add all tips randomly (order shuffled)
    const tips = prng.shuffle(tipMoves).slice(0, tipMoves.length);
    const notation = [...main, ...tips].join(" ");
    return {
      puzzleId: "pyram",
      notation,
      seed: request.seed,
      state: { kind: "random-move", mainLength, tips: true },
    };
  },
};

const skewbMoves = ["R", "R'", "L", "L'", "U", "U'", "B", "B'"];
const scramblerSkewb = makeNxNScrambler("skewb", skewbMoves, 11);

const scramblerSq1: Scrambler = {
  puzzleId: "sq1",
  generate: (request: ScrambleRequest): Scramble => {
    const prng = resolvePrng("sq1", request.seed);
    const length = request.lengthHint ?? 12;
    const twists: string[] = [];
    for (let i = 0; i < length; i++) {
      const top = prng.int(-6, 7); // -6..6
      const bottom = prng.int(-6, 7);
      if (top === 0 && bottom === 0) {
        i--;
        continue;
      }
      twists.push(`(${top},${bottom}) /`);
    }
    const notation = twists.join(" ");
    return {
      puzzleId: "sq1",
      notation,
      seed: request.seed,
      state: { kind: "random-move", length },
    };
  },
};

const scramblerClock: Scrambler = {
  puzzleId: "clock",
  generate: (request: ScrambleRequest): Scramble => {
    const prng = resolvePrng("clock", request.seed);
    const dialTurn = () => prng.int(-5, 6); // -5..5 inclusive
    const pins = ["UR", "UL", "DR", "DL"].map(
      (p) => `${p}${prng.choice(["U", "D"])}`,
    );
    const dials = Array.from({ length: 14 }, () => dialTurn());
    const notation = `Pins: ${pins.join(" ")} | Dials: ${dials.join(" ")}`;
    return {
      puzzleId: "clock",
      notation,
      seed: request.seed,
      state: { kind: "random-move", pins, dials },
    };
  },
};

const megaminxTurns = ["R++", "R--", "D++", "D--"] as const;

const scramblerMegaminx: Scrambler = {
  puzzleId: "minx",
  generate: (request: ScrambleRequest): Scramble => {
    const prng = resolvePrng("minx", request.seed);
    const lines: string[] = [];
    const length = request.lengthHint ?? 10; // lines
    for (let i = 0; i < length; i++) {
      const pair = `${prng.choice(megaminxTurns)} ${prng.choice(megaminxTurns)}`;
      lines.push(pair);
    }
    lines.push("U"); // final line per WCA convention
    const notation = lines.join("\n");
    return {
      puzzleId: "minx",
      notation,
      seed: request.seed,
      state: { kind: "random-move", lines: length },
    };
  },
};

const registry = new Map<PuzzleId, Scrambler>([
  ["222", scrambler222],
  ["333", scrambler333],
  ["444", scrambler444],
  ["555", scrambler555],
  ["666", scrambler666],
  ["777", scrambler777],
  ["pyram", scramblerPyraminx],
  ["skewb", scramblerSkewb],
  ["sq1", scramblerSq1],
  ["clock", scramblerClock],
  ["minx", scramblerMegaminx],
]);

export function registerScrambler(scrambler: Scrambler): void {
  registry.set(scrambler.puzzleId, scrambler);
}

export function getScrambler(puzzleId: PuzzleId): Scrambler | undefined {
  return registry.get(puzzleId);
}

export function generateScramble(request: ScrambleRequest): Scramble {
  const scrambler = getScrambler(request.puzzleId) ?? genericScrambler;
  return scrambler.generate(request);
}
