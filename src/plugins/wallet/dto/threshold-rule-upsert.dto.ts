export class ThresholdRuleUpsertDto {
  wallet_id: number;
  threshold_code: string;
  threshold_amount: string;
  currency?: string;
  meta_json?: object;
}
