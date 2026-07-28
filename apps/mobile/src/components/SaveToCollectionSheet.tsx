import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, fontWeight, type ThemeColors } from '../constants/theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import {
  collectionService,
  CollectionMembership,
} from '../lib/collections/collectionService';
import { CreateCollectionModal } from './CreateCollectionModal';
import { useTranslation } from 'react-i18next';

type Props = {
  visible: boolean;
  artworkId: string;
  onClose: () => void;
};

export function SaveToCollectionSheet({ visible, artworkId, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [rows, setRows] = useState<CollectionMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await collectionService.listForArtwork(artworkId);
      setRows(res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [artworkId]);

  useEffect(() => {
    if (visible) {
      load();
    }
  }, [visible, load]);

  const handleToggle = useCallback(
    async (row: CollectionMembership) => {
      if (togglingId) return;
      setTogglingId(row.id);

      const nextContains = !row.containsArtwork;

      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                containsArtwork: nextContains,
                itemCount: r.itemCount + (nextContains ? 1 : -1),
              }
            : r,
        ),
      );

      try {
        if (nextContains) {
          await collectionService.addItem(row.id, artworkId);
        } else {
          await collectionService.removeItem(row.id, artworkId);
        }
      } catch {
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  containsArtwork: row.containsArtwork,
                  itemCount: row.itemCount,
                }
              : r,
          ),
        );
        setError(true);
      } finally {
        setTogglingId(null);
      }
    },
    [artworkId, togglingId],
  );

  const handleCreate = useCallback(
    async (name: string) => {
      const { id } = await collectionService.create(name);
      await collectionService.addItem(id, artworkId);
      setCreateOpen(false);
      await load();
    },
    [artworkId, load],
  );

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.title}>{t('save.title')}</Text>

            <Pressable style={styles.newRow} onPress={() => setCreateOpen(true)}>
              <Ionicons name="add" size={22} color={colors.primary} />
              <Text style={styles.newText}>{t('save.newCollection')}</Text>
            </Pressable>

            {loading ? (
              <ActivityIndicator style={styles.center} color={colors.primary} />
            ) : error ? (
              <Pressable style={styles.center} onPress={load}>
                <Text style={styles.errorText}>{t('save.errorLoad')}</Text>
              </Pressable>
            ) : rows.length === 0 ? (
              <Text style={styles.center}>
                {t('save.empty')}
              </Text>
            ) : (
              <FlatList
                data={rows}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.row}
                    onPress={() => handleToggle(item)}
                    disabled={togglingId !== null}
                  >
                    <Ionicons
                      name={
                        item.containsArtwork ? 'bookmark' : 'bookmark-outline'
                      }
                      size={20}
                      color={
                        item.containsArtwork ? colors.primary : colors.textMuted
                      }
                    />
                    <Text style={styles.rowText} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {togglingId === item.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : item.containsArtwork ? (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.primary}
                      />
                    ) : null}
                  </Pressable>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <CreateCollectionModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.subheading,
    fontWeight: fontWeight.semibold,
    color: c.text,
    marginBottom: spacing.md,
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    marginBottom: spacing.xs,
  },
  newText: {
    fontSize: fontSize.heading,
    color: c.primary,
    fontWeight: fontWeight.medium,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  rowText: {
    flex: 1,
    fontSize: fontSize.heading,
    color: c.text,
  },
  center: {
    textAlign: 'center',
    color: c.textMuted,
    paddingVertical: spacing.xl,
  },
  errorText: {
    textAlign: 'center',
    color: c.danger,
  },
});