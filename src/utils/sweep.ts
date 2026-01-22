/**
 * SNR sweep utilities for exporting BER data.
 */

import type { ModulationScheme } from '../types';
import { BITS_PER_SYMBOL } from '../types';
import {
  generateConstellation,
  modulateBits,
  demodulate,
  generateRandomBits,
  countBitErrorsFromStrings,
  symbolToBits,
} from './modulation';
import { addAWGN } from './channel';
import { theoreticalBER } from './theory';

export interface SweepPoint {
  snrDb: number;
  simulatedBER: number;
  theoreticalBER: number;
  bitCount: number;
  errorCount: number;
}

export function simulateBerAtSnr(
  scheme: ModulationScheme,
  snrDb: number,
  bitsTarget: number,
  batchSymbols: number = 400
): SweepPoint {
  const bitsPerSymbol = BITS_PER_SYMBOL[scheme];
  const constellation = generateConstellation(scheme);

  let bitCount = 0;
  let errorCount = 0;

  while (bitCount < bitsTarget) {
    const remainingBits = bitsTarget - bitCount;
    const symbolsThisBatch = Math.min(
      batchSymbols,
      Math.ceil(remainingBits / bitsPerSymbol)
    );
    const bitsThisBatch = symbolsThisBatch * bitsPerSymbol;

    const bits = generateRandomBits(bitsThisBatch);
    const txSymbols = modulateBits(bits, constellation);
    const rxSymbols = addAWGN(txSymbols, snrDb, scheme);
    const decodedBitStrings = demodulate(rxSymbols, constellation);

    for (let i = 0; i < txSymbols.length; i++) {
      const txBitString = symbolToBits(txSymbols[i], constellation);
      const rxBitString = decodedBitStrings[i];
      errorCount += countBitErrorsFromStrings(txBitString, rxBitString);
    }

    bitCount += bitsThisBatch;
  }

  return {
    snrDb,
    simulatedBER: bitCount > 0 ? errorCount / bitCount : 0,
    theoreticalBER: theoreticalBER(scheme, snrDb),
    bitCount,
    errorCount,
  };
}
