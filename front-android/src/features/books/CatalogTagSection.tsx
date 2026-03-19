import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "../../components/Screen";
import { colors, spacing } from "../../theme";
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
      <Card>
        {title ? <Text style={styles.discoveryTitle}>{title}</Text> : null}
        <View style={styles.discoveryWrap}>
          {items.map((item) => (
            <View key={item} style={styles.discoveryChip}>
              <Text style={styles.discoveryChipText}>{item}</Text>
            </View>
          ))}
        </View>
      </Card>
    );
  }

  if (groups && groups.length > 0) {
    return (
      <Card>
        {groups.map((group) => (
          <View key={group.group} style={styles.discoveryGroup}>
            <Text style={styles.discoveryTitle}>{group.group}</Text>
            <View style={styles.discoveryWrap}>
              {group.items.map((item) => (
                <Pressable
                  key={`${group.group}-${item}`}
                  style={styles.discoveryChip}
                  onPress={() => onKeywordPress?.(item)}
                >
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
  discoveryGroup: {
    gap: spacing.sm,
  },
  discoveryTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
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
    paddingVertical: 8,
  },
  discoveryChipText: {
    color: colors.text,
    fontWeight: "600",
  },
});
