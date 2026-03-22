export class PolicyGateUpsertDto {
  wallet_id: number;
  gate_code: string;
  status: string;
  meta_json?: object;
}
