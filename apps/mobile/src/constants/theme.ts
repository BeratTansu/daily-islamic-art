/**
 * DIA renk paleti ve boşluk sabitleri.
 * Dark mode YOK (MVP kapsamı dışı). İleride gerekirse burada
 * lightColors/darkColors ayrımına gidilir, ekranlar değişmez.
 */

export const colors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#1A1A1A',
  textMuted: '#6B7280',
  primary: '#1B6B5C',   // geçici — DIA ana rengi, İslam sanatına uygun bir ton seç
  border: '#E5E7EB',
  danger: '#DC2626',
  like: '#DC2626',   // beğenili kalp
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;