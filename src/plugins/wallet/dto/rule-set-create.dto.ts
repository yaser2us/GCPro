export class RuleSetCreateDto {
  wallet_id: number;
  version?: string;
  effective_from?: string;
  effective_to?: string;
  meta_json?: object;
}
