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
  Platform,
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
import {
  downloadImageToGallery,
  shareArtworkImage,
  setArtworkAsWallpaper,
} from '../../../lib/media/downloadImage';
import { useTranslation } from 'react-i18next';

export default function ArtworkDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const isEN = i18n.language === 'en';
  const [artwork, setArtwork] = useState<ArtworkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [memberships, setMemberships] = useState<CollectionMembership[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [settingWallpaper, setSettingWallpaper] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const data = await artworkService.getBySlug(slug);
      setArtwork(data);
    } catch {
      setError(t('artwork.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMemberships = useCallback(async () => {
    if (!artwork) return;
    try {
      const rows = await collectionService.listForArtwork(artwork.id);
      setMemberships(rows);
    } catch {
    }
  }, [artwork]);

  useEffect(() => {
    loadMemberships();
  }, [loadMemberships]);

  const containing = memberships.filter((m) => m.containsArtwork);
  const isInAnyCollection = containing.length > 0;

  const handleBookmarkPress = useCallback(() => {
    if (!artwork) return;
    if (containing.length === 1) {
      const only = containing[0];
      Alert.alert(
        t('artwork.removeFromCollectionTitle'),
        t('artwork.removeFromCollectionMessage', { name: only.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.remove'),
            style: 'destructive',
            onPress: async () => {
              try {
                await collectionService.removeItem(only.id, artwork.id);
                await loadMemberships();
              } catch {
                Alert.alert(t('common.error'), t('artwork.removeError'));
              }
            },
          },
        ],
      );
    } else {
      setSaveOpen(true);
    }
  }, [artwork, containing, loadMemberships, t]);

  const handleDownload = async () => {
    if (!artwork) return;
    setDownloading(true);
    const result = await downloadImageToGallery(artwork.imageUrl, artwork.id);
    setDownloading(false);

    if (result.ok) {
      setMenuVisible(false);
      Alert.alert(t('common.success'), t('toast.downloadSuccess'));
    } else if (result.reason === 'permission') {
      Alert.alert(t('common.error'), t('toast.permissionRequired'));
    } else {
      Alert.alert(t('common.error'), t('toast.downloadError'));
    }
  };

  const handleShare = async () => {
    if (!artwork) return;
    setSharing(true);
    const result = await shareArtworkImage(artwork.imageUrl, artwork.id);
    setSharing(false);

    // Menu her durumda kapanir: sistem sheet'i ustune aciliyor,
    // arkada menunun acik kalmasi tuhaf olurdu.
    setMenuVisible(false);

    // BASARI ALERT'I YOK: kullanici sheet'i iptal etse de shareAsync
    // sessizce basarili doner → "paylasildi" demek YALAN olur.
    if (!result.ok) {
      Alert.alert(
        t('common.error'),
        result.reason === 'unavailable'
          ? t('artwork.shareUnavailable')
          : t('artwork.shareError'),
      );
    }
  };

  const handleWallpaper = async () => {
    if (!artwork) return;
    setSettingWallpaper(true);
    const result = await setArtworkAsWallpaper(artwork.imageUrl, artwork.id);
    setSettingWallpaper(false);
    setMenuVisible(false);

    // Basari alert'i YOK: sistem secicisi aciliyor, kullanici ne oldugunu goruyor.
    // Iptal ederse de "yapildi" demek yalan olurdu.
    if (!result.ok && result.reason === 'error') {
      Alert.alert(t('common.error'), t('artwork.wallpaperError'));
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
        <Text style={styles.errorText}>{error ?? t('artwork.notFound')}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
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

          {(() => {
            const localizedText = isEN ? artwork.translation : artwork.transcription;
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

          {artwork.description ? (
            <Text style={styles.description}>{artwork.description}</Text>
          ) : null}

          <View style={styles.metaList}>
            <MetaRow label={t('artwork.metaScript')} value={artwork.script} />
            <MetaRow label={t('artwork.metaPeriod')} value={artwork.period} />
            <MetaRow label={t('artwork.metaMedium')} value={artwork.medium} />
            <MetaRow label={t('artwork.metaDimensions')} value={artwork.dimensions} />
          </View>
        </View>
      </ScrollView>

      <SaveToCollectionSheet
        visible={saveOpen}
        artworkId={artwork.id}
        onClose={() => {
          setSaveOpen(false);
          loadMemberships();
        }}
      />

      <ActionSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        items={[
          {
            icon: 'download-outline',
            label: t('artwork.actionDownload'),
            onPress: handleDownload,
            loading: downloading,
          },
          {
            icon: 'share-social-outline',
            label: t('artwork.actionShare'),
            onPress: handleShare,
            loading: sharing,
          },
          // iOS'ta madde HIC gosterilmez — Apple policy nedeniyle karsiligi yok,
          // gosterilse olu buton olurdu.
          ...(Platform.OS === 'android'
            ? [
              {
                icon: 'image-outline' as const,
                label: t('artwork.actionWallpaper'),
                onPress: handleWallpaper,
                loading: settingWallpaper,
              },
            ]
            : []),
        ]}
      />
    </>
  );
}

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