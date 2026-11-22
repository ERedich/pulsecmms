import { IsString, Matches, MinLength } from "class-validator";

export class UpdateSiteDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorCode!: string;
}
