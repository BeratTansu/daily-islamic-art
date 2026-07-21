// src/components/ArtworkCard.tsx
// Feed + Kesfet ortak kart. Onceden FeedPage.tsx icinde dosya-yereldi;
// DiscoverPage de kullanacagi icin buraya cikarildi (tek kaynak, kopya yok).
import { useMemo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { ArtworkListItem } from '../lib/artworks/artworkService';
import { LikeButton } from './LikeButton';
import { displayLikeCount } from '../lib/artworks/likeCount';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';

// --- Kalp + begeni sayisi ---
function LikeMeta({
    id,
    baseCount,
    backendIsLiked,
    displayIsLiked,
    onToggleLike,
}: {
    id: string;
    baseCount: number;
    backendIsLiked: boolean;
    displayIsLiked: boolean;
    onToggleLike: (id: string, isLiked: boolean) => void;
}) {
    const count = displayLikeCount(baseCount, backendIsLiked, displayIsLiked);
    return (
        <View style={styles.likeMeta}>
            <LikeButton isLiked={displayIsLiked} onPress={() => onToggleLike(id, displayIsLiked)} />
            {count > 0 && <Text style={styles.likeCount}>{count}</Text>}
        </View>
    );
}

// --- Gorsel jesti (cift dokunma begen / tek dokunma detay) ---
function useImageGesture(
    id: string,
    slug: string,
    isLiked: boolean,
    onPress: (slug: string) => void,
    onDoubleTapLike: (id: string, isLiked: boolean) => void,
) {
    return useMemo(() => {
        const doubleTap = Gesture.Tap()
            .numberOfTaps(2)
            .maxDelay(180)
            .onEnd(() => {
                runOnJS(onDoubleTapLike)(id, isLiked);
            });

        const singleTap = Gesture.Tap().onEnd(() => {
            runOnJS(onPress)(slug);
        });

        return Gesture.Exclusive(doubleTap, singleTap);
    }, [id, slug, isLiked, onPress, onDoubleTapLike]);
}

// --- Feed/Kesfet karti ---
export function ArtworkCard({
    item,
    isLiked,
    onPress,
    onToggleLike,
    onDoubleTapLike,
}: {
    item: ArtworkListItem;
    isLiked: boolean;
    onPress: (slug: string) => void;
    onToggleLike: (id: string, isLiked: boolean) => void;
    onDoubleTapLike: (id: string, isLiked: boolean) => void;
}) {
    const gesture = useImageGesture(item.id, item.slug, isLiked, onPress, onDoubleTapLike);

    return (
        <View style={styles.card}>
            <GestureDetector gesture={gesture}>
                <Image
                    source={{ uri: item.thumbUrl ?? item.imageUrl }}
                    style={styles.cardImage}
                    resizeMode="cover"
                />
            </GestureDetector>

            <View style={styles.metaRow}>
                <Pressable style={styles.metaText} onPress={() => onPress(item.slug)}>
                    <Text style={styles.cardArtist} numberOfLines={1}>
                        {item.artist.name}
                    </Text>
                </Pressable>
                <LikeMeta
                    id={item.id}
                    baseCount={item.likeCount}
                    backendIsLiked={item.isLiked ?? false}
                    displayIsLiked={isLiked}
                    onToggleLike={onToggleLike}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardImage: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: colors.surface,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    metaText: {
        flex: 1,
        marginRight: spacing.sm,
    },
    likeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    likeCount: {
        fontSize: fontSize.caption,
        color: colors.textMuted,
    },
    cardArtist: {
        fontSize: fontSize.heading,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
});