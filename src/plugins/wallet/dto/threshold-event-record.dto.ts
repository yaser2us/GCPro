export class ThresholdEventRecordDto {
  wallet_id: number;
  threshold_code: string;
  current_balance: string;
  threshold_amount: string;
  currency?: string;
  idempotency_key?: string;
  payload_json?: object;
}
