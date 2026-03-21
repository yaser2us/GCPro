import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Actor DTO
 * Source: specs/policy/policy.pillar.v2.yml lines 1298-1306
 */
export class ActorDto {
  @IsString()
  actor_type: 'user' | 'system' | 'admin';

  @IsString()
  @IsNotEmpty()
  actor_id: string;
}

/**
 * ActivatePolicy Request DTO
 * Source: specs/policy/policy.pillar.v2.yml lines 1391-1399
 *
 * HTTP: POST /api/v1/policy/:policyId/activate
 */
export class ActivatePolicyRequestDto {
  @IsString()
  policy_id: string;

  @ValidateNested()
  @Type(() => ActorDto)
  actor: ActorDto;
}
