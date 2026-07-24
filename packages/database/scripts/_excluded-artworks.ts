// Yayina ASLA cikmamasi gereken eserler (kaynak gorseli bozuk).
//
// 24/07 tespiti: thumbnail backfill'de thumb'i anormal kucuk cikan 19 eser
// gorsel olarak dogrulandi → 14'unun ORIJINALI DE tamamen siyah (kaynak veri bozuk,
// kurtarilamaz). Kalan 5'i (3895, 5126, 5133, 5300, 7875) saglam cikti — sade/ince
// eserler, kucuk thumb normaldi.
//
// NEDEN SILINMEDI: import sourceId upsert ile calisir → silinen kayit bir sonraki
// import'ta geri gelir. Silmek kalici cozum degil, ayrica geri donussuz.
//
// NEDEN SEMA ALANI DEGIL: 14 bilinen, sabit, buyumesi beklenmeyen kayit icin
// migration + backfill + panel gorunurlugu agir kalir. TETIKLEYICI: yeni import'ta
// bozuk eser cikarsa veya liste ~50'yi asarsa → `isBroken Boolean` alanina tasi.
//
// NEDEN IMPORT'A DEGIL KURASYONA: import'un isi kaynagi tazelemek, kurasyonun isi
// ne yayinlanacagina karar vermek. "Bozuk gorsel" bir KURASYON karari.
// (PROJE_REFERANS: "import kurasyon kararlarina dokunmaz")
export const EXCLUDED_SOURCE_IDS: readonly string[] = [
    '2334', '2391', '2906', '2907', '2917',
    '3356', '3398', '3649', '3798',
    '5085',
    '7627', '7852',
    '8199', '8385',
];