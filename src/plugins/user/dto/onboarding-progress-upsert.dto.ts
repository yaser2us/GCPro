export class OnboardingProgressUpsertDto {
  user_id: number;
  step_code: string;
  state: string;
  meta_json?: any;
}
