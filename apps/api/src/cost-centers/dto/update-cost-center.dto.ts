import { IsString, MinLength } from "class-validator";

export class UpdateCostCenterDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsString()
  @MinLength(1)
  name!: string;
}
