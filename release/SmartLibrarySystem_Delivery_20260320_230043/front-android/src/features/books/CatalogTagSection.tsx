import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "../../components/Screen";
import { colors, radius, spacing } from "../../theme";
import type { DiscoveryKeywordGroup } from "./useBooksCatalog";

interface CatalogTagSectionProps {
  title?: string;
  items?: string[];
  groups?: DiscoveryKeywordGroup[];
  onKeywordPress?: (value: string) => void;
}

export function CatalogTagSection({
  title,
  items,
  groups,
  onKeywordPress,
}: CatalogTagSectionProps) {
  if (items && items.length > 0) {
    return (
      <Card style={styles.card}>
        {title ? (
          <View style={styles.headerRow}>
            <Text style={styles.discoveryTitle}>{title}</Text>
            <MaterialCommunityIcons name="filter-variant" size={16} color={colors.textSoft} />
          </View>
        ) : null}
        <View style={styles.discoveryWrap}>
          {items.map((item) => (
            <View key={item} style={styles.discoveryChip}>
              <MaterialCommunityIcons name="label-outline" size={14} color={colors.primaryDark} />
              <Text style={styles.discoveryChipText}>{item}</Text>
            </View>
          ))}
        </View>
      </Card>
    );
  }

  if (groups && groups.length > 0) {
    return (
      <Card style={styles.card}>
        {groups.map((group) => (
          <View key={group.group} style={styles.discoveryGroup}>
            <View style={styles.headerRow}>
              <Text style={styles.discoveryTitle}>{group.group}</Text>
              <MaterialCommunityIcons name="lightning-bolt-outline" size={16} color={colors.textSoft} />
            </View>
            <View style={styles.discoveryWrap}>
              {group.items.map((item) => (
                <Pressable
                  key={`${group.group}-${item}`}
                  style={({ pressed }) => [
                    styles.discoveryChip,
                    pressed ? styles.discoveryChipPressed : undefined,
                  ]}
                  onPress={() => onKeywordPress?.(item)}
                >
                  <MaterialCommunityIcons name="magnify" size={14} color={colors.primaryDark} />
                  <Text style={styles.discoveryChipText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </Card>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  discoveryGroup: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  discoveryTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  discoveryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  discoveryChip: {
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  discoveryChipPressed: {
    opacity: 0.88,
  },
  discoveryChipText: {
    color: colors.text,
    fontWeight: "600",
  },
});
