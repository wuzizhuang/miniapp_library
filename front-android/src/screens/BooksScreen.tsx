import React from "react";
import { Text } from "react-native";
import { useNavigation, useRoute, type CompositeNavigationProp, type RouteProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card, Screen } from "../components/Screen";
import { EmptyCard, ErrorCard } from "../components/Ui";
import { BookCatalogCard } from "../features/books/BookCatalogCard";
import { BooksFiltersCard } from "../features/books/BooksFiltersCard";
import { CatalogTagSection } from "../features/books/CatalogTagSection";
import { useBooksCatalog } from "../features/books/useBooksCatalog";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { useAuth } from "../store/auth";

export function BooksScreen() {
  const route = useRoute<RouteProp<MainTabParamList, "BooksTab">>();
  const navigation = useNavigation<
    CompositeNavigationProp<
      BottomTabNavigationProp<MainTabParamList, "BooksTab">,
      NativeStackNavigationProp<RootStackParamList>
    >
  >();
  const { user } = useAuth();
  const {
    keyword,
    setKeyword,
    titleKeyword,
    setTitleKeyword,
    authorKeyword,
    setAuthorKeyword,
    publisherKeyword,
    setPublisherKeyword,
    selectedCategory,
    setSelectedCategory,
    selectedSort,
    setSelectedSort,
    availableOnly,
    setAvailableOnly,
    books,
    categories,
    favoriteIds,
    loanedIds,
    reservedIds,
    loading,
    refreshing,
    errorMessage,
    discoveryKeywords,
    activeFilters,
    loadAll,
    resetFilters,
  } = useBooksCatalog(user);

  React.useEffect(() => {
    const presetKeyword = route.params?.presetKeyword?.trim();

    if (!presetKeyword) {
      return;
    }

    setKeyword(presetKeyword);
    navigation.setParams({ presetKeyword: undefined });
  }, [navigation, route.params?.presetKeyword, setKeyword]);

  return (
    <Screen
      title="图书目录"
      subtitle="支持关键词、题名、作者、出版社、分类和可借状态的联合检索。"
      refreshing={refreshing}
      onRefresh={() => {
        void loadAll(true);
      }}
    >
      <BooksFiltersCard
        keyword={keyword}
        onKeywordChange={setKeyword}
        titleKeyword={titleKeyword}
        onTitleKeywordChange={setTitleKeyword}
        authorKeyword={authorKeyword}
        onAuthorKeywordChange={setAuthorKeyword}
        publisherKeyword={publisherKeyword}
        onPublisherKeywordChange={setPublisherKeyword}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        availableOnly={availableOnly}
        onAvailableOnlyChange={setAvailableOnly}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
        onReset={resetFilters}
      />

      <CatalogTagSection title="当前筛选" items={activeFilters} />
      <CatalogTagSection groups={discoveryKeywords} onKeywordPress={setKeyword} />

      {errorMessage ? (
        <ErrorCard
          message={errorMessage}
          onRetry={() => {
            void loadAll(true);
          }}
        />
      ) : null}

      {!loading && !errorMessage && books.length === 0 ? (
        <EmptyCard title="未找到相关图书" description="试试调整关键词、作者、出版社、分类或排序方式。" />
      ) : null}

      {loading ? <Card><Text>正在加载馆藏目录...</Text></Card> : null}

      {!loading && !errorMessage && books.length > 0 ? (
        books.map((book) => (
          <BookCatalogCard
            key={book.bookId}
            book={book}
            favoriteIds={favoriteIds}
            loanedIds={loanedIds}
            reservedIds={reservedIds}
            onPress={(bookId) => navigation.navigate("BookDetail", { bookId })}
          />
        ))
      ) : null}
    </Screen>
  );
}
