export class RegistrationTokenVerifyDto {
  /** Magic-link token — required if otp_plain not provided */
  token?: string;
  /** Plain OTP value to compare against stored otp_hash — required if token not provided */
  otp_plain?: string;
}
