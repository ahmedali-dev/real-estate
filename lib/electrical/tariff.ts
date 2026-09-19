/**
 * Placeholder residential electricity tariff for converting kWh to
 * Bolivianos. This is NOT a verified real ENDE (or local utility) rate —
 * it's a round placeholder so the dashboard can show a cost figure at all.
 * Bolivia's actual residential tariff is tiered (the price per kWh rises
 * with consumption), so a single flat rate is already a simplification
 * even once you plug in a real number.
 *
 * Replace this with your utility's actual rate (or a tiered calculation)
 * before relying on the Bs figures for anything real.
 */
export const BS_PER_KWH = 0.87;

export function kwhToBs(kwh: number): number {
  return Math.round(kwh * BS_PER_KWH * 100) / 100;
}
