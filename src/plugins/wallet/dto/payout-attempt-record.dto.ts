export class PayoutAttemptRecordDto {
  provider: string;
  provider_ref?: string;
  status: string;
  failure_code?: string;
  request_json?: object;
  response_json?: object;
}
