import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Token varsa doğrular ve `req.user`'ı doldurur; yoksa isteği yine de geçirir.
 * `req.user` misafirde `undefined` kalır.
 *
 * Kullanım: hem misafirin hem login'li kullanıcının erişebildiği ama
 * cevabı kullanıcıya göre zenginleşen endpoint'ler (örn. GET /artworks/daily
 * → isLiked). Guard'sız bırakırsak Passport hiç çalışmaz, token gönderilse
 * bile req.user boş kalır.
 *
 * YETKİLENDİRME YAPMAZ. Korumalı endpoint'lerde JwtAuthGuard kullanılır.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    // Passport strategy çalışsın diye super'i çağırıyoruz, ama sonucu ne olursa
    // olsun geçiriyoruz. Strategy hata atarsa handleRequest yakalar.
    // Passport, strategy başarısız olunca err veya user=false ile buraya gelir.
    // Varsayılan davranış: UnauthorizedException. Biz bastırıyoruz.
    handleRequest<TUser>(err: unknown, user: TUser): TUser | undefined {
        // Geçersiz/eksik token → misafir muamelesi. Hata atma.
        if (err || !user) return undefined;
        return user;
    }
}