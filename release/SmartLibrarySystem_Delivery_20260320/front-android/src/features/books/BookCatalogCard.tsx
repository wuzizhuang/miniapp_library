import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CoverImage, InfoPill } from "../../components/Ui";
import { colors, radius, spacing } from "../../theme";
import type { Book } from "../../types/book";
import { joinText } from "../../utils/format";
import { getCatalogStatus, getStatusMeta } from "./catalog";

interface BookCatalogCardProps {
  book: Book;
  favoriteIds: Set<number>;
  loanedIds: Set<number>;
  reservedIds: Set<number>;
  onPress: (bookId: number) => void;
}

export function BookCatalogCard({
  book,
  favoriteIds,
  loanedIds,
  reservedIds,
  onPress,
}: BookCatalogCardProps) {
  const status = getCatalogStatus(book, favoriteIds, loanedIds, reservedIds);
  const statusMeta = getStatusMeta(status);

  return (
    <Pressable
      style={({ pressed }) => [styles.bookCard, pressed ? styles.pressedCard : undefined]}
      onPress={() => onPress(book.bookId)}
    >
      <CoverImage title={book.title} uri={book.coverUrl} style={styles.cover} />

      <View style={styles.bookBody}>
        <View style={styles.bookHeader}>
          <View style={styles.titleWrap}>
            <Text style={styles.bookTitle} numberOfLines={2}>
              {book.title}
            </Text>
            <Text style={styles.bookMeta}>{joinText(book.authorNames, "未知作者")}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSoft} />
        </View>

        <View style={styles.metaRow}>
          <MetaItem icon="shape-outline" text={book.categoryName || "未分类"} />
          <MetaItem icon="office-building-outline" text={book.publisherName || "未标注出版社"} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statsCard}>
            <Text style={styles.statsValue}>{book.availableCopies}</Text>
            <Text style={styles.statsLabel}>可借副本</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsValue}>{book.totalCopies}</Text>
            <Text style={styles.statsLabel}>总藏数量</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsValue}>{book.pendingReservationCount}</Text>
            <Text style={styles.statsLabel}>预约排队</Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <InfoPill label={statusMeta.label} tone={statusMeta.tone} icon="bookmark-check-outline" />
          {book.onlineAccessUrl ? <InfoPill label="含线上资源" tone="primary" icon="web" /> : null}
          {book.isbn ? <InfoPill label={`ISBN ${book.isbn}`} icon="barcode" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function MetaItem({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  text: string;
}) {
  return (
    <View style={styles.metaItem}>
      <MaterialCommunityIcons name={icon} size={14} color={colors.textSoft} />
      <Text style={styles.metaItemText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bookCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  pressedCard: {
    opacity: 0.9,
    transform: [{ scale: 0.992 }],
  },
  cover: {
    width: 74,
    height: 108,
  },
  bookBody: {
    flex: 1,
    gap: spacing.sm,
  },
  bookHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  titleWrap: {
    flex: 1,
    gap: 4,
  },
  bookTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23,
  },
  bookMeta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  metaRow: {
    gap: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaItemText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  statsCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    gap: 2,
  },
  statsValue: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "800",
  },
  statsLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
