// src/app/(app)/artwork/[slug].tsx
import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { artworkService, ArtworkDetail } from '../../../lib/artworks/artworkService';
import {
  collectionService,
  CollectionMembership,
} from '../../../lib/collections/collectionService';
import { useLike } from '../../../lib/artworks/useLike';
import { useLikeContext } from '../../../context/LikeContext';
import { LikeButton } from '../../../components/LikeButton';
import { displayLikeCount } from '../../../lib/artworks/likeCount';
import { SaveToCollectionSheet } from '../../../components/SaveToCollectionSheet';
import { colors, spacing, fontSize, fontWeight, fontFamily } from '../../../constants/theme';
import { ActionSheet } from '../../../components/ActionSheet';
import { downloadImageToGallery } from '../../../lib/media/downloadImage';
import { useTranslation } from 'react-i18next';

export default function ArtworkDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { i18n } = useTranslation();
  // Aktif dile göre içerik seçimi: TR → transcription, EN → translation.
  // Yanlış dilde içerikle doldurmuyoruz — yoksa o blok hiç görünmez.
  const isEN = i18n.language === 'en';
  const [artwork, setArtwork] = useState<ArtworkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  // Bu eserin bulunduğu koleksiyonlar (bookmark dolu/boş + 0/1/2+ dallanması için)
  const [memberships, setMemberships] = useState<CollectionMembership[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const data = await artworkService.getBySlug(slug);
      setArtwork(data);
    } catch {
      setError('Eser yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  // Bu eserin bulunduğu koleksiyonları çek (bookmark durumu + dallanma)
  const loadMemberships = useCallback(async () => {
    if (!artwork) return;
    try {
      const rows = await collectionService.listForArtwork(artwork.id);
      setMemberships(rows);
    } catch {
      // sessiz — bookmark boş kalır, kullanıcı yine de sheet açabilir
    }
  }, [artwork]);

  // artwork yüklenince membership'i çek
  useEffect(() => {
    loadMemberships();
  }, [loadMemberships]);

  // Bu eserin içinde olduğu koleksiyonlar
  const containing = memberships.filter((m) => m.containsArtwork);
  const isInAnyCollection = containing.length > 0;

  // Bookmark'a basınca 0/1/2+ dallanması
  const handleBookmarkPress = useCallback(() => {
    if (!artwork) return;
    if (containing.length === 1) {
      // tek koleksiyon → onaylı kısayol (kör silme değil)
      const only = containing[0];
      Alert.alert(
        'Koleksiyondan çıkar',
        `"${only.name}" koleksiyonundan çıkarılsın mı?`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Çıkar',
            style: 'destructive',
            onPress: async () => {
              try {
                await collectionService.removeItem(only.id, artwork.id);
                await loadMemberships(); // bookmark tazelensin
              } catch {
                Alert.alert('Hata', 'Çıkarılamadı, tekrar dene.');
              }
            },
          },
        ],
      );
    } else {
      // 0 veya 2+ → sheet aç
      setSaveOpen(true);
    }
  }, [artwork, containing, loadMemberships]);

  // 3. İndir handler — Galeriye indirme işlemini yönetir
  const handleDownload = async () => {
    if (!artwork) return;
    setDownloading(true);
    const result = await downloadImageToGallery(artwork.imageUrl, artwork.id);
    setDownloading(false);

    if (result.ok) {
      setMenuVisible(false);
      Alert.alert('Başarılı', 'Görsel galeriye kaydedildi');
    } else if (result.reason === 'permission') {
      Alert.alert('Hata', 'Kaydetmek için galeri izni gerekli');
    } else {
      Alert.alert('Hata', 'İndirilemedi, tekrar deneyin');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !artwork) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Eser bulunamadı.'}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      {/* 4. Üç nokta butonu — Stack.Screen headerRight içerisine yerleştirildi */}
      <Stack.Screen
        options={{
          title: artwork.contributors ?? artwork.artist.name,
          headerShown: true,
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable onPress={() => setMenuVisible(true)} hitSlop={8} style={{ marginRight: spacing.sm }}>
              <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Image source={{ uri: artwork.imageUrl }} style={styles.image} resizeMode="contain" />

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{artwork.contributors ?? artwork.artist.name}</Text>
            <View style={styles.actions}>
              <DetailLikeButton artwork={artwork} />
              <Pressable
                onPress={handleBookmarkPress}
                hitSlop={8}
                style={styles.saveBtn}
              >
                <Ionicons
                  name={isInAnyCollection ? 'bookmark' : 'bookmark-outline'}
                  size={26}
                  color={isInAnyCollection ? colors.primary : colors.text}
                />
              </Pressable>
            </View>
          </View>

          {/* Eserdeki metin — dile göre alan seçimi.
              TR → transcription, EN → translation. Yanlış dilde içerikle DOLDURMA:
              aktif dilde uygun alan yoksa o satır çizilmez (yalan içerik göstermeyiz).
              arabicText + sourceRef dilden bağımsız (orijinal metin / künye). */}
          {(() => {
            // Aktif dilde gösterilecek metin: EN ise translation, TR ise transcription.
            const localizedText = isEN ? artwork.translation : artwork.transcription;
            // Blok, en az bir gösterilebilir alan varsa çizilir.
            const hasBlock = artwork.arabicText || localizedText || artwork.sourceRef;
            if (!hasBlock) return null;
            return (
              <View style={styles.textBlock}>
                {artwork.arabicText ? (
                  <Text style={styles.arabic}>{artwork.arabicText}</Text>
                ) : null}
                {localizedText ? (
                  <Text style={isEN ? styles.translation : styles.transcription}>
                    {localizedText}
                  </Text>
                ) : null}
                {artwork.sourceRef ? (
                  <Text style={styles.sourceRef}>{artwork.sourceRef}</Text>
                ) : null}
              </View>
            );
          })()}

          {/* Açıklama */}
          {artwork.description ? (
            <Text style={styles.description}>{artwork.description}</Text>
          ) : null}

          {/* Metadata satırları — sadece dolu olanlar */}
          <View style={styles.metaList}>
            <MetaRow label="Hat türü" value={artwork.script} />
            <MetaRow label="Dönem" value={artwork.period} />
            <MetaRow label="Malzeme" value={artwork.medium} />
            <MetaRow label="Boyutlar" value={artwork.dimensions} />
          </View>
        </View>
      </ScrollView>

      <SaveToCollectionSheet
        visible={saveOpen}
        artworkId={artwork.id}
        onClose={() => {
          setSaveOpen(false);
          loadMemberships(); // sheet kapanınca bookmark durumunu tazele (yol a)
        }}
      />

      {/* 5. Menü (ActionSheet) — SaveToCollectionSheet'in hemen altına eklendi */}
      <ActionSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        items={[
          {
            icon: 'download-outline',
            label: 'İndir',
            onPress: handleDownload,
            loading: downloading,
          },
        ]}
      />
    </>
  );
}

// Kalbi kendi okur: LikeContext defteri ?? backend'in isLiked'ı.
// Ayrı component çünkü aynı `getIsLiked(...)` ifadesi hem çizimde
// hem onPress'te lazım — tek yerde hesaplansın.
function DetailLikeButton({ artwork }: { artwork: ArtworkDetail }) {
  const { toggle } = useLike();
  const { getIsLiked } = useLikeContext();
  const isLiked = getIsLiked(artwork.id, artwork.isLiked);
  const count = displayLikeCount(artwork.likeCount, artwork.isLiked, isLiked);

  return (
    <View style={styles.likeMeta}>
      <LikeButton isLiked={isLiked} onPress={() => toggle(artwork.id, isLiked)} size={28} />
      {count > 0 && <Text style={styles.likeCount}>{count}</Text>}
    </View>
  );
}

// Etiketli satır — value null ise hiç render etme
function MetaRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.surface,
  },
  body: {
    padding: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontFamily: fontFamily.serif,
    letterSpacing: 0.5,
    flex: 1,
    marginRight: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  saveBtn: {
    padding: spacing.xs,
  },
  likeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  likeCount: {
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  textBlock: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  arabic: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 36,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  translation: {
    color: colors.text,
    fontSize: fontSize.body,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  sourceRef: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
  },
  description: {
    color: colors.text,
    fontSize: fontSize.body,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  metaList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: fontSize.secondary,
  },
  metaValue: {
    color: colors.text,
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.body,
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryText: {
    color: colors.background,
    fontWeight: fontWeight.semibold,
  },
  transcription: {
    color: colors.text,
    fontSize: fontSize.body,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
});