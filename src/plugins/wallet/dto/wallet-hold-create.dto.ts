export class WalletHoldCreateDto {
  wallet_id: number;
  reason_code: string;
  amount: string;
  currency?: string;
  ref_type?: string;
  ref_id?: string;
  idempotency_key?: string;
  request_id?: string;
  expires_at?: string;
}
