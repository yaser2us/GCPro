export class WalletBatchItemAddDto {
  wallet_id: number;
  account_id: number;
  item_type: string;
  amount: string;
  currency?: string;
  ref_type?: string;
  ref_id?: string;
  idempotency_key?: string;
  meta_json?: object;
}
