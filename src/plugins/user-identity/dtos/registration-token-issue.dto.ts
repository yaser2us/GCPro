export class RegistrationTokenIssueDto {
  purpose?: string;
  channel_type: string;
  channel_value: string;
  invite_code?: string;
  token?: string;
  otp_hash?: string;
  expires_at: string;
  meta_json?: any;
}
