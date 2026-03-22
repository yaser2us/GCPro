export class RuleAddDto {
  rule_code: string;
  operator?: string;
  value_str?: string;
  value_num?: number;
  value_json?: object;
}
