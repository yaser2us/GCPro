export class VerificationStatusUpsertDto {
  account_id: number;
  type: string;
  status: string;
  meta_json?: any;
}
