import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsString,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsString()
  @MinLength(1)
  loginName!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  secondarySiteKeys!: string[];

  @ValidateIf((_, value) => value !== null)
  @IsString()
  employeeKey!: string | null;
}
