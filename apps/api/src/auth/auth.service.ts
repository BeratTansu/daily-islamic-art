import {
    Injectable,
    ConflictException,
    UnauthorizedException,
  } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import * as argon2 from 'argon2';
  import { PrismaService } from '../prisma/prisma.service';
  import { RegisterDto } from './dto/register.dto';
  import { LoginDto } from './dto/login.dto';
  import { JwtPayload } from './strategies/jwt.strategy';
  
  @Injectable()
  export class AuthService {
    constructor(
      private prisma: PrismaService,
      private jwt: JwtService,
    ) {}
  
    // ─── REGISTER ───
    async register(dto: RegisterDto) {
      const exists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (exists) throw new ConflictException('Bu e-posta zaten kayıtlı');
  
      const passwordHash = await argon2.hash(dto.password);
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
        },
        select: { id: true, email: true, displayName: true, role: true },
      });
  
      return this.issueTokens(user.id, user.email, user);
    }
  
    // ─── LOGIN ───
    async login(dto: LoginDto) {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (!user) throw new UnauthorizedException('E-posta veya şifre hatalı');
  
      const valid = await argon2.verify(user.passwordHash, dto.password);
      if (!valid) throw new UnauthorizedException('E-posta veya şifre hatalı');
  
      return this.issueTokens(user.id, user.email, {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      });
    }
  
    // ─── REFRESH (rotation) ───
    async refresh(refreshToken: string) {
      let payload: JwtPayload;
      try {
        payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
          secret: process.env.JWT_REFRESH_SECRET,
        });
      } catch {
        throw new UnauthorizedException('Geçersiz refresh token');
      }
  
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Oturum bulunamadı');
      }
  
      // Gelen token, DB'deki hash ile eşleşiyor mu? (rotation kontrolü)
      const matches = await argon2.verify(user.refreshTokenHash, refreshToken);
      if (!matches) throw new UnauthorizedException('Refresh token eşleşmedi');
  
      return this.issueTokens(user.id, user.email, {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      });
    }
  
    // ─── LOGOUT ───
    async logout(userId: string) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
      return { success: true };
    }
  
    // ─── ORTAK: token üret + refresh hash'ini DB'ye yaz ───
    private async issueTokens(
        userId: string,
        email: string,
        userPublic: { id: string; email: string; displayName: string; role: string },
      ) {
        const payload: JwtPayload = { sub: userId, email };
      
        const accessExpires = (process.env.JWT_ACCESS_EXPIRES ?? '15m') as string;
        const refreshExpires = (process.env.JWT_REFRESH_EXPIRES ?? '7d') as string;
      
        const [accessToken, refreshToken] = await Promise.all([
          this.jwt.signAsync(payload, {
            secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: accessExpires as any,
          }),
          this.jwt.signAsync(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: refreshExpires as any,
          }),
        ]);
  
      // Rotation: yeni refresh'in hash'ini sakla, eskisini geçersiz kıl
      const refreshTokenHash = await argon2.hash(refreshToken);
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash },
      });
  
      return { user: userPublic, accessToken, refreshToken };
    }
  }