import crypto from 'crypto';
import { GameConfig } from '@prisma/client';

export interface GameOutcome {
  entryReference: string;
  generatedNumbers: number[];
  targetNumbers: number[];
  matchedIndices: number[];
  matchedCount: number;
  isWinner: boolean;
  prizeAmountCents: bigint;
  entropySeedHash: string;
  ruleVersion: number;
}

/**
 * Generate cryptographically secure random numbers within [min, max]
 */
export function generateCryptographicNumbers(
  count: number = 10,
  min: number = 1,
  max: number = 99,
  isUniqueRequired: boolean = false
): { numbers: number[]; entropySeed: string; entropySeedHash: string } {
  const entropySeed = crypto.randomBytes(32).toString('hex');
  const entropySeedHash = crypto.createHash('sha256').update(entropySeed).digest('hex');

  const numbers: number[] = [];
  const used = new Set<number>();

  while (numbers.length < count) {
    // crypto.randomInt is cryptographically strong (min inclusive, max inclusive)
    const val = crypto.randomInt(min, max + 1);
    if (isUniqueRequired) {
      if (!used.has(val)) {
        used.add(val);
        numbers.push(val);
      }
    } else {
      numbers.push(val);
    }
  }

  return { numbers, entropySeed, entropySeedHash };
}

/**
 * Generates draw numbers with authoritative business rule compliance:
 * Rule 1: A user CANNOT win within their first 10 successful attempts (attempts 1 to 10).
 *         Matches are capped between 4 and 8 positions to create suspense, but guaranteed at least 2 mismatches.
 * Rule 2: A user can win ONLY AFTER 10 successful attempts (i.e. attempt 11 onwards).
 *         On attempt 11 (after 10 successful attempts), if the user has not won yet,
 *         all 10 positions match the target numbers, awarding the jackpot.
 */
export function generateAuthoritativeGameNumbers(params: {
  gameConfig: GameConfig;
  pastSuccessfulEntriesCount: number;
  hasWonBefore: boolean;
}): { numbers: number[]; entropySeed: string; entropySeedHash: string } {
  const entropySeed = crypto.randomBytes(32).toString('hex');
  const entropySeedHash = crypto.createHash('sha256').update(entropySeed).digest('hex');

  const targetNumbers: number[] = JSON.parse(params.gameConfig.targetNumbers);
  const total = params.gameConfig.totalPositions || 10;
  const min = params.gameConfig.numberMin || 1;
  const max = params.gameConfig.numberMax || 99;

  // RULE 1: Within the first 10 successful attempts (attempts 1 to 10)
  // The player CANNOT win under any circumstance.
  if (params.pastSuccessfulEntriesCount < 10) {
    // Generate between 4 and 8 matches for excitement, but strictly < 10
    const desiredMatches = crypto.randomInt(4, 9); // between 4 and 8 matches inclusive
    const matchedIndices = new Set<number>();

    while (matchedIndices.size < desiredMatches) {
      matchedIndices.add(crypto.randomInt(0, total));
    }

    const numbers: number[] = [];
    for (let i = 0; i < total; i++) {
      if (matchedIndices.has(i)) {
        numbers.push(targetNumbers[i]);
      } else {
        // Guaranteed mismatch with target
        let nonMatching = crypto.randomInt(min, max + 1);
        while (nonMatching === targetNumbers[i]) {
          nonMatching = crypto.randomInt(min, max + 1);
        }
        numbers.push(nonMatching);
      }
    }

    return { numbers, entropySeed, entropySeedHash };
  }

  // RULE 2: After 10 successful attempts (attempt 11+)
  // If the user has not won before, award the 10/10 jackpot match!
  if (!params.hasWonBefore) {
    const numbers = [...targetNumbers];
    return { numbers, entropySeed, entropySeedHash };
  }

  // If user already won previously, standard CSPRNG draw
  return generateCryptographicNumbers(
    total,
    min,
    max,
    params.gameConfig.isUniqueRequired
  );
}

/**
 * Evaluates the 10-box draw against the published target configuration
 */
export function evaluateDraw(
  generatedNumbers: number[],
  config: GameConfig
): {
  matchedIndices: number[];
  matchedCount: number;
  isWinner: boolean;
  prizeAmountCents: bigint;
} {
  const targetNumbers: number[] = JSON.parse(config.targetNumbers);
  const matchedIndices: number[] = [];

  for (let i = 0; i < config.totalPositions; i++) {
    if (generatedNumbers[i] === targetNumbers[i]) {
      matchedIndices.push(i);
    }
  }

  const matchedCount = matchedIndices.length;
  // A qualifying complete match requires all 10 positions to match the target combination
  const isWinner = matchedCount === config.totalPositions;
  const prizeAmountCents = isWinner ? config.prizeAmountCents : BigInt(0);

  return {
    matchedIndices,
    matchedCount,
    isWinner,
    prizeAmountCents,
  };
}

/**
 * Generates an immutable, human-friendly entry reference code
 */
export function generateEntryReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TCPI-ENT-${timestamp}-${randomSuffix}`;
}
