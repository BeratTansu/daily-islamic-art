/**
 * DIA renk paleti ve boşluk sabitleri.
 *
 * İki palet, TEK isim seti: semantic isimlendirme sayesinde ekranlar
 * "krem" değil "background" okur → koyu modda değer değişir, isim değil.
 *
 * Runtime tema değişimi: ThemeContext + useThemedStyles (StyleSheet.create
 * modül seviyesinde renkleri YAKALAR, o yüzden factory'den üretilir).
 *
 * `as const` bilinçli YOK: darkColors'ı `ThemeColors` ile tiplemek için
 * alanların `string` olması gerekiyor. Bu tipleme = drift kalkanı —
 * dark'ta eksik/fazla key derlemede patlar.
 */

const lightColors = {
  // ── Zemin ──
  background: '#F5EDE1',   // ana krem/kağıt zemin (referans: tezhip kağıdı)
  surface: '#FBF4EA',      // kart/panel — zeminden bir tık AÇIK, sıcak beyaz

  // ── Metin ──
  text: '#2A2620',         // koyu kahve-siyah (saf siyah değil, kağıda oturur)
  textMuted: '#6B6357',    // kısık kahve — ikincil metin

  // ── Marka / aksiyon ──
  primary: '#324130',      // koyu zeytin yeşil (mühür/logo yeşili)
  primaryDeep: '#26301F',  // daha koyu yeşil — buton zemini / vurgu başlık
  onPrimary: '#FBF4EA',    // primary/primaryDeep ZEMİNİ üstündeki metin+ikon rengi
  accent: '#A8916B',       // altın/bronz — SADECE dekor (çizgi, ikon, motif). Metin DEĞİL.

  // ── Yapı ──
  border: '#E3D5C3',       // krem zemine uyumlu sıcak hairline (soğuk gri gitti)

  // ── Semantic (kimlik dışı, bilinçli korundu) ──
  danger: '#DC2626',       // çıkış/silme — evrensel kırmızı, paletten muaf
  like: '#B03A2E',         // beğeni kalbi — kırmızı ama toprak tonuna çekildi, kremle çakışmaz
};

/** Ekranların gördüğü renk sözleşmesi. Tek kaynak = lightColors'ın şekli. */
export type ThemeColors = typeof lightColors;

/**
 * Koyu palet — SAF SİYAH DEĞİL, sıcak koyu kahve.
 * Gerekçe: marka krem/toprak; #000 kimlikle çelişir ve OLED "delik" hissi verir.
 * surface burada background'dan AÇIK (elevation konvansiyonu) — light'takiyle
 * aynı YÖN ama ilişki koyuda "yükselen yüzey daha açık" olarak okunur.
 * like/danger isim olarak paletten muaf ama koyu zeminde parlaklık artar,
 * o yüzden değerleri bir tık desatüre/aydınlatıldı (kural aynı, ton uyarlandı).
 */
export const darkColors: ThemeColors = {
  background: '#1A1714',
  surface: '#241F1A',

  text: '#F0E7DA',
  textMuted: '#A99C8B',

  primary: '#4E6A49',
  primaryDeep: '#3C5238',
  onPrimary: '#F0E7DA',
  accent: '#C9AE7F',       // koyuda altın parlar — kural AYNI: dekor-only, metin değil

  border: '#3A322A',

  danger: '#EF5350',
  like: '#D9614F',
};

export { lightColors };

/**
 * GEÇİŞ ALIAS'I — dönüştürülmemiş ekranlar derlenmeye devam etsin diye.
 * Bu alias sabittir (tema değişimini TAKİP ETMEZ). Tüm ekranlar
 * useThemedStyles/useTheme'e geçince SİLİNECEK.
 */
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fontSize = {
  title: 24,       // ekran başlığı (detay title)
  subheading: 18,   // modal/sheet başlığı
  heading: 16,     // kart/bölüm başlığı
  body: 15,        // gövde metni
  secondary: 14,   // ikincil (meta label/value)
  caption: 13,     // küçük/etiket (sourceRef, dailyLabel)
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// Başlık fontu (Cormorant Garamond, 500 medium) — SADECE başlıklarda.
// Gövde/UI metni sistem sans'ında kalır (okunabilirlik + referans yapısı).
export const fontFamily = {
  serif: 'CormorantGaramond_500Medium',
} as const;