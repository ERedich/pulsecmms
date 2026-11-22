import {
  IsIn,
  IsString,
  MinLength,
  ValidateIf,
} from "class-validator";
import { ASSET_TYPES } from "../asset.types";

export class CreateAssetDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsIn(ASSET_TYPES)
  type!: (typeof ASSET_TYPES)[number];

  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MinLength(1)
  parentKey!: string | null;

  @IsString()
  @MinLength(1)
  costCenterKey!: string;

  @IsString()
  serialNumber!: string;

  @IsString()
  manufacturer!: string;
}
