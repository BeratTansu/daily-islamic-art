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
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { artworkService, ArtworkDetail } from '../../../lib/artworks/artworkService';
import { colors, spacing } from '../../../constants/theme';

const TYPE_LABELS: Record<string, string> = {
  HAT: 'Hat',
  TEZHIP: 'Tezhip',
  MINYATUR: 'Minyatür',
  EBRU: 'Ebru',
  CINI: 'Çini',
  DIGER: 'Diğer',
};

export default function ArtworkDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [artwork, setArtwork] = useState<ArtworkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <Stack.Screen options={{ title: artwork.title ?? 'Eser', headerShown: true }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Image source={{ uri: artwork.imageUrl }} style={styles.image} resizeMode="contain" />

        <View style={styles.body}>
          <Text style={styles.title}>{artwork.title ?? 'İsimsiz'}</Text>
          <Text style={styles.artist}>{artwork.contributors ?? artwork.artist.name}</Text>
          <Text style={styles.typeBadge}>{TYPE_LABELS[artwork.type] ?? artwork.type}</Text>

          {/* Eserdeki metin — alanlardan biri bile doluysa göster (arabicText'e bağlı değil) */}
          {artwork.arabicText || artwork.transcription || artwork.translation || artwork.sourceRef ? (
            <View style={styles.textBlock}>
              {artwork.arabicText ? (
                <Text style={styles.arabic}>{artwork.arabicText}</Text>
              ) : null}
              {artwork.transcription ? (
                <Text style={styles.transcription}>{artwork.transcription}</Text>
              ) : null}
              {artwork.translation ? (
                <Text style={styles.translation}>{artwork.translation}</Text>
              ) : null}
              {artwork.sourceRef ? (
                <Text style={styles.sourceRef}>{artwork.sourceRef}</Text>
              ) : null}
            </View>
          ) : null}

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
    </>
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
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  artist: {
    color: colors.textMuted,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  typeBadge: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.lg,
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
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  sourceRef: {
    color: colors.textMuted,
    fontSize: 13,
  },
  description: {
    color: colors.text,
    fontSize: 15,
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
    fontSize: 14,
  },
  metaValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 15,
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
    fontWeight: '600',
  },
  transcription: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
});