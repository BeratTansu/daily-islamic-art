// Gosterilecek begeni sayisi = backend base + oturum override deltasi.
// LikeContext count tutmaz (sadece isLiked defteri) → sayi buradan turetilir.
// backendIsLiked: backend'in dondugu isLiked (base).
// displayIsLiked: getIsLiked(id, base) sonucu (override uygulanmis hali).
export function displayLikeCount(
    baseCount: number,
    backendIsLiked: boolean,
    displayIsLiked: boolean,
): number {
    if (backendIsLiked === displayIsLiked) return baseCount; // override yok / base'e esit
    return displayIsLiked ? baseCount + 1 : baseCount - 1; // begendi / kaldirdi
}