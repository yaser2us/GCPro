export class WithdrawalRequestCreateDto {
  wallet_id: number;
  account_id: number;
  bank_profile_id: number;
  amount: string;
  currency?: string;
  meta_json?: object;
}
