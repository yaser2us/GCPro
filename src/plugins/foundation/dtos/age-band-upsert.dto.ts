import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';

export class AgeBandUpsertDto {
  @IsString()
  @MaxLength(32)
  code: string;

  @IsNumber()
  min_age: number;

  @IsNumber()
  max_age: number;

  @IsOptional()
  @IsString()
  age_factor?: string;
}
