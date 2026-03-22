export class DepositIntentCreateDto {
  wallet_id: number;
  account_id: number;
  amount: string;
  currency?: string;
  ref_type?: string;
  ref_id?: string;
  idempotency_key?: string;
  meta_json?: object;
}
