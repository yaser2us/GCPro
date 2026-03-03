/**
 * Money type for representing monetary values
 * Based on mission.pillar.yml Money type definition
 */
export interface Money {
  currency: string; // ISO currency code (e.g., 'MYR', 'USD')
  amount_minor: number; // Amount in minor units (e.g., cents, sen)
}

/**
 * Helper to create Money from major units
 * @example fromMajor('MYR', 50.00) => { currency: 'MYR', amount_minor: 5000 }
 */
export function fromMajor(currency: string, amountMajor: number): Money {
  return {
    currency,
    amount_minor: Math.round(amountMajor * 100),
  };
}

/**
 * Helper to get major units from Money
 * @example toMajor({ currency: 'MYR', amount_minor: 5000 }) => 50.00
 */
export function toMajor(money: Money): number {
  return money.amount_minor / 100;
}
