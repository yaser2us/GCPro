export class SpendIntentCreateDto {
  wallet_id: number;
  account_id: number;
  amount: string;
  currency?: string;
  // H6: purpose_code used to gate COIN wallet spends
  // 'annual_fee' is the only allowed purpose for COIN wallets
  purpose_code?: string;
  ref_type?: string;
  ref_id?: string;
  idempotency_key?: string;
  meta_json?: object;
}
