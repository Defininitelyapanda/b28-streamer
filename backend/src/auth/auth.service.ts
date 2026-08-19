import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleName, UserStatus } from '@prisma/client';
import { randomInt } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { Request } from 'express';
import {
  generateSecureToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from '../common/crypto.util';
import { addDuration } from '../common/token.util';
import { EmailService } from '../common/email/email.service';
import { FilmmakersService } from '../filmmakers/filmmakers.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  ForgotPasswordDto,
  GoogleAuthDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SendPhoneOtpDto,
  VerifyEmailDto,
  VerifyPhoneOtpDto,
} from './dto/auth.dto';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private settingsService: SettingsService,
    private filmmakersService: FilmmakersService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_IN_USE', message: 'Unable to create account with provided details.' });
    }

    const isFilmmakerSignup = dto.accountType === 'FILMMAKER';
    const roleNames = [RoleName.STREAMER];

    const roles = await this.prisma.role.findMany({ where: { name: { in: roleNames } } });
    if (roles.length !== roleNames.length) {
      throw new BadRequestException({ code: 'ROLE_NOT_FOUND', message: 'Default role not configured.' });
    }

    const passwordHash = await hashPassword(dto.password);
    const autoVerify =
      this.configService.get<string>('AUTH_AUTO_VERIFY') === 'true' ||
      this.configService.get<string>('NODE_ENV') === 'development';

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        emailVerifiedAt: autoVerify ? new Date() : null,
        profile: {
          create: { displayName: dto.displayName },
        },
        roles: {
          create: roles.map((role) => ({ roleId: role.id })),
        },
        subscription: {
          create: {
            plan: 'FREE_WITH_ADS',
            adsEnabled: true,
          },
        },
      },
    });

    if (isFilmmakerSignup) {
      await this.filmmakersService.createApplication(user.id);
    }

    if (!autoVerify) {
      await this.createEmailVerificationToken(user.id, user.email);
      return { message: 'Registration successful. Please verify your email.' };
    }

    return { message: 'Registration successful.', autoVerified: true };
  }

  async login(dto: LoginDto, req: Request) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException({ code: 'ACCOUNT_SUSPENDED', message: 'Account is suspended.' });
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException({ code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email before logging in.' });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException({ code: 'ACCOUNT_LOCKED', message: 'Too many failed attempts. Try again later.' });
    }

    const valid = await verifyPassword(user.passwordHash, dto.password);
    if (!valid) {
      await this.recordFailedLogin(user.id, user.failedLoginAttempts);
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    await this.ensureDefaultSubscription(user.id);

    return this.issueTokens(user.id, user.email, req);
  }

  private async ensureDefaultSubscription(userId: string) {
    await this.prisma.userSubscription.upsert({
      where: { userId },
      create: { userId, plan: 'FREE_WITH_ADS', adsEnabled: true },
      update: {},
    });
  }

  async refresh(refreshToken: string, req: Request) {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token.' });
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token.' });
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user.id, user.email, req, stored.id);
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (stored && !stored.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      await this.prisma.userSession.updateMany({
        where: { refreshTokenId: stored.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { message: 'Logged out successfully.' };
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'All sessions revoked.' };
  }

  async listSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId, revokedAt: null },
    });
    if (!session) {
      throw new BadRequestException({ code: 'SESSION_NOT_FOUND', message: 'Session not found.' });
    }

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    if (session.refreshTokenId) {
      await this.prisma.refreshToken.updateMany({
        where: { id: session.refreshTokenId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return { message: 'Session revoked.' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = hashToken(dto.token);
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException({ code: 'INVALID_TOKEN', message: 'Invalid or expired verification token.' });
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Email verified successfully.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (user && !user.deletedAt) {
      const token = generateSecureToken();
      const expiresAt = addDuration(new Date(), '1h');
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt,
        },
      });
      await this.emailService.sendPasswordResetEmail(user.email, token);
    }
    return { message: 'If an account exists, password reset instructions have been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = hashToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException({ code: 'INVALID_TOKEN', message: 'Invalid or expired reset token.' });
    }

    const passwordHash = await hashPassword(dto.password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password reset successfully.' };
  }

  async sendPhoneOtp(dto: SendPhoneOtpDto) {
    if (!(await this.settingsService.isFeatureEnabled('PHONE_AUTH'))) {
      throw new ForbiddenException({ code: 'FEATURE_DISABLED', message: 'Phone authentication is not enabled.' });
    }

    const phone = this.normalizePhone(dto.phone);
    const code = String(randomInt(100000, 1000000));
    const expiresAt = addDuration(new Date(), '10m');

    await this.prisma.otpChallenge.create({
      data: {
        phone,
        codeHash: hashToken(code),
        expiresAt,
      },
    });

    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      console.log(`[B28 OTP] Phone ${phone} code: ${code}`);
      return { message: 'Verification code sent.', devCode: code };
    }

    return { message: 'Verification code sent.' };
  }

  async verifyPhoneOtp(dto: VerifyPhoneOtpDto, req: Request) {
    if (!(await this.settingsService.isFeatureEnabled('PHONE_AUTH'))) {
      throw new ForbiddenException({ code: 'FEATURE_DISABLED', message: 'Phone authentication is not enabled.' });
    }

    const phone = this.normalizePhone(dto.phone);
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new UnauthorizedException({ code: 'INVALID_OTP', message: 'Invalid or expired verification code.' });
    }

    if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
      throw new UnauthorizedException({ code: 'OTP_LOCKED', message: 'Too many failed attempts. Request a new code.' });
    }

    if (challenge.codeHash !== hashToken(dto.code)) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: challenge.attempts + 1 },
      });
      throw new UnauthorizedException({ code: 'INVALID_OTP', message: 'Invalid or expired verification code.' });
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { usedAt: new Date() },
    });

    let user = await this.prisma.user.findFirst({ where: { phone } });
    if (!user) {
      const placeholderEmail = `${phone.replace(/\D/g, '')}@phone.b28.local`;
      const streamerRole = await this.prisma.role.findUnique({ where: { name: RoleName.STREAMER } });
      if (!streamerRole) {
        throw new BadRequestException({ code: 'ROLE_NOT_FOUND', message: 'Default role not configured.' });
      }

      user = await this.prisma.user.create({
        data: {
          email: placeholderEmail,
          phone,
          passwordHash: await hashPassword(generateSecureToken()),
          emailVerifiedAt: new Date(),
          profile: { create: { displayName: dto.displayName ?? `User ${phone.slice(-4)}` } },
          roles: { create: { roleId: streamerRole.id } },
          subscription: { create: { plan: 'FREE_WITH_ADS', adsEnabled: true } },
        },
      });
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException({ code: 'ACCOUNT_SUSPENDED', message: 'Account is suspended.' });
    }

    return this.issueTokens(user.id, user.email, req);
  }

  async googleAuth(dto: GoogleAuthDto, req: Request) {
    if (!(await this.settingsService.isFeatureEnabled('GOOGLE_AUTH'))) {
      throw new ForbiddenException({ code: 'FEATURE_DISABLED', message: 'Google authentication is not enabled.' });
    }

    const profile = await this.parseGoogleCredential(dto);
    const providerId = profile.googleId;
    const email = profile.email.toLowerCase();

    let oauth = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider: 'google', providerId } },
      include: { user: true },
    });

    if (oauth?.user) {
      if (oauth.user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException({ code: 'ACCOUNT_SUSPENDED', message: 'Account is suspended.' });
      }
      return this.issueTokens(oauth.user.id, oauth.user.email, req);
    }

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const streamerRole = await this.prisma.role.findUnique({ where: { name: RoleName.STREAMER } });
      if (!streamerRole) {
        throw new BadRequestException({ code: 'ROLE_NOT_FOUND', message: 'Default role not configured.' });
      }

      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash: await hashPassword(generateSecureToken()),
          emailVerifiedAt: new Date(),
          profile: { create: { displayName: profile.displayName } },
          roles: { create: { roleId: streamerRole.id } },
          subscription: { create: { plan: 'FREE_WITH_ADS', adsEnabled: true } },
        },
      });
    }

    await this.prisma.oAuthAccount.upsert({
      where: { provider_providerId: { provider: 'google', providerId } },
      create: { userId: user.id, provider: 'google', providerId },
      update: { userId: user.id },
    });

    return this.issueTokens(user.id, user.email, req);
  }

  private normalizePhone(phone: string) {
    const digits = phone.replace(/\s/g, '');
    if (digits.startsWith('+')) return digits;
    if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
    if (digits.startsWith('254')) return `+${digits}`;
    return `+${digits}`;
  }

  private async parseGoogleCredential(dto: GoogleAuthDto) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    if (clientId) {
      try {
        const client = new OAuth2Client(clientId);
        const ticket = await client.verifyIdToken({ idToken: dto.idToken, audience: clientId });
        const payload = ticket.getPayload();
        if (!payload?.email || !payload.sub) {
          throw new BadRequestException({ code: 'INVALID_GOOGLE_TOKEN', message: 'Invalid Google credential.' });
        }
        return {
          email: payload.email,
          googleId: payload.sub,
          displayName: payload.name ?? payload.email.split('@')[0],
        };
      } catch {
        throw new BadRequestException({ code: 'INVALID_GOOGLE_TOKEN', message: 'Invalid Google credential.' });
      }
    }

    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new BadRequestException({
        code: 'GOOGLE_NOT_CONFIGURED',
        message: 'Google sign-in is not configured on the server.',
      });
    }

    try {
      const payload = JSON.parse(
        Buffer.from(dto.idToken.split('.')[1], 'base64url').toString('utf8'),
      ) as { email?: string; sub?: string; name?: string };
      if (!payload.email || !payload.sub) {
        throw new Error('Invalid token payload');
      }
      return {
        email: payload.email,
        googleId: payload.sub,
        displayName: payload.name ?? payload.email.split('@')[0],
      };
    } catch {
      throw new BadRequestException({ code: 'INVALID_GOOGLE_TOKEN', message: 'Invalid Google credential.' });
    }
  }

  private async createEmailVerificationToken(userId: string, email: string) {
    const token = generateSecureToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: addDuration(new Date(), '24h'),
      },
    });
    await this.emailService.sendVerificationEmail(email, token);
  }

  private async recordFailedLogin(userId: string, currentAttempts: number) {
    const attempts = currentAttempts + 1;
    const data: { failedLoginAttempts: number; lockedUntil?: Date } = { failedLoginAttempts: attempts };
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      data.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    }
    await this.prisma.user.update({ where: { id: userId }, data });
  }

  private async issueTokens(userId: string, email: string, req: Request, rotatedFromId?: string) {
    const refreshTtl = this.configService.get<string>('JWT_REFRESH_TTL', '7d');
    const accessTtl = this.configService.get<string>('JWT_ACCESS_TTL', '15m');
    const refreshToken = generateSecureToken();
    const refreshRecord = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: addDuration(new Date(), refreshTtl),
        rotatedFromId,
      },
    });

    const session = await this.prisma.userSession.create({
      data: {
        userId,
        refreshTokenId: refreshRecord.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
        deviceInfo: req.headers['user-agent']?.slice(0, 120) ?? null,
      },
    });

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, sessionId: session.id },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl as `${number}m`,
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtl,
      sessionId: session.id,
    };
  }
}
