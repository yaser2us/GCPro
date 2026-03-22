export class WalletBatchCreateDto {
  batch_type: string;
  ref_type?: string;
  ref_id?: string;
  idempotency_key?: string;
  meta_json?: object;
}
