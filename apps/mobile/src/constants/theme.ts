/**
 * DIA renk paleti ve boşluk sabitleri.
 * Dark mode YOK (MVP kapsamı dışı). İleride gerekirse burada
 * lightColors/darkColors ayrımına gidilir, ekranlar değişmez.
 */

export const colors = {
  // ── Zemin ──
  background: '#F5EDE1',   // ana krem/kağıt zemin (referans: tezhip kağıdı)
  surface: '#FBF4EA',      // kart/panel — zeminden bir tık açık, sıcak beyaz

  // ── Metin ──
  text: '#2A2620',         // koyu kahve-siyah (saf siyah değil, kağıda oturur)
  textMuted: '#6B6357',    // kısık kahve — ikincil metin

  // ── Marka / aksiyon ──
  primary: '#324130',      // koyu zeytin yeşil (mühür/logo yeşili)
  primaryDeep: '#26301F',  // daha koyu yeşil — buton zemini / vurgu başlık
  accent: '#A8916B',       // altın/bronz — SADECE dekor (çizgi, ikon, motif). Metin DEĞİL.

  // ── Yapı ──
  border: '#E3D5C3',       // krem zemine uyumlu sıcak hairline (soğuk gri gitti)

  // ── Semantic (kimlik dışı, bilinçli korundu) ──
  danger: '#DC2626',       // çıkış/silme — evrensel kırmızı, paletten muaf
  like: '#B03A2E',         // beğeni kalbi — kırmızı ama toprak tonuna çekildi, kremle çakışmaz
} as const;

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