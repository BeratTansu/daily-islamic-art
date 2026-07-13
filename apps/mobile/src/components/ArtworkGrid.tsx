import { useCallback } from 'react';
import {
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    type ListRenderItem,
    type RefreshControlProps,
} from 'react-native';
import { colors, spacing } from '../constants/theme';

// Grid'in ihtiyaç duyduğu minimal shape. CollectionArtwork da ArtworkListItem da
// bunu karşılar (fazlası var, eksiği yok) → tek component iki tipi de yer.
// "Benzemek aynı olmak değildir" — ama ortak alt küme varsa ona bağlan.
export type GridArtwork = {
    id: string;
    slug: string;
    thumbUrl: string | null;
    imageUrl: string;
};

type ArtworkGridProps<T extends GridArtwork> = {
    data: T[];
    onPressItem: (slug: string) => void;
    // Koleksiyon detayı başlığı buraya girer (grid ile birlikte kayar).
    // Beğendiklerim ekranı vermez → Stack header'ı yeterli.
    ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
    ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
    // Sonsuz kaydırma gerekirse ekran bağlar. Koleksiyonda çoğu zaman gerekmez.
    onEndReached?: () => void;
    ListFooterComponent?: React.ComponentType | React.ReactElement | null;
    refreshControl?: React.ReactElement<RefreshControlProps>;
};

// Generic: çağıran taraf tam tipini korur (T), grid sadece GridArtwork'e bakar.
export function ArtworkGrid<T extends GridArtwork>({
    data,
    onPressItem,
    ListHeaderComponent,
    ListEmptyComponent,
    onEndReached,
    ListFooterComponent,
    refreshControl,
}: ArtworkGridProps<T>) {
    const renderItem = useCallback<ListRenderItem<T>>(
        ({ item }) => (
            <Pressable style={styles.cell} onPress={() => onPressItem(item.slug)}>
                <Image
                    source={{ uri: item.thumbUrl ?? item.imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                />
            </Pressable>
        ),
        [onPressItem],
    );

    return (
        <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.content}
            ListHeaderComponent={ListHeaderComponent}
            ListEmptyComponent={ListEmptyComponent}
            ListFooterComponent={ListFooterComponent}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            refreshControl={refreshControl}
        />
    );
}

const GAP = spacing.sm;

const styles = StyleSheet.create({
    content: {
        padding: spacing.md,
        flexGrow: 1,
    },
    // İki sütun arası yatay boşluk. justifyContent'le kareler kenarlara yaslanır,
    // aradaki boşluğu gap verir.
    row: {
        gap: GAP,
    },
    // Dikey boşluk: her kare kendi altına margin koyar (ItemSeparator iki sütunda
    // satır arası çalışmaz).
    cell: {
        flex: 1,
        marginBottom: GAP,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    image: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: colors.surface,
    },
});