import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class SendPhoneOtpDto {
  @IsString()
  @MinLength(8)
  phone!: string;
}

export class VerifyPhoneOtpDto {
  @IsString()
  @MinLength(8)
  phone!: string;

  @IsString()
  @MinLength(4)
  code!: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}

export class GoogleAuthDto {
  @IsString()
  idToken!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  googleId?: string;
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  displayName!: string;

  @IsOptional()
  @IsIn(['STREAMER', 'FILMMAKER'])
  accountType?: 'STREAMER' | 'FILMMAKER';
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

export class VerifyEmailDto {
  @IsString()
  token!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class LogoutDto {
  @IsString()
  refreshToken!: string;
}
