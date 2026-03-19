import React from "react";
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
      style={styles.bookCard}
      onPress={() => onPress(book.bookId)}
    >
      <CoverImage title={book.title} uri={book.coverUrl} />
      <View style={styles.bookBody}>
        <View style={styles.bookHeader}>
          <Text style={styles.bookTitle}>{book.title}</Text>
          <InfoPill label={statusMeta.label} tone={statusMeta.tone} />
        </View>
        <Text style={styles.bookMeta}>{joinText(book.authorNames, "未知作者")}</Text>
        <Text style={styles.bookMeta}>
          {book.categoryName || "未分类"} · {book.publisherName || "未标注出版社"}
        </Text>
        <Text style={styles.bookMeta}>
          可借 {book.availableCopies} / 总藏 {book.totalCopies}
          {book.pendingReservationCount > 0 ? ` · 排队 ${book.pendingReservationCount} 人` : ""}
        </Text>
        <View style={styles.bookFooter}>
          {book.onlineAccessUrl ? <InfoPill label="含线上资源" tone="primary" /> : null}
          {book.pendingReservationCount > 0 ? <InfoPill label={`排队 ${book.pendingReservationCount}`} tone="warning" /> : null}
          {book.isbn ? <InfoPill label={`ISBN ${book.isbn}`} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bookCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bookBody: {
    flex: 1,
    gap: 6,
  },
  bookHeader: {
    gap: spacing.xs,
  },
  bookTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  bookMeta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  bookFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
