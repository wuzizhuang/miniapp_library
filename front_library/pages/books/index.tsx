// pages/books/index.tsx
import React from "react";

import DefaultLayout from "@/components/layouts/default";
import LibraryCatalog from "@/components/modules/catalog/LibraryCatalog";

export default function BooksPage() {
  return (
    <DefaultLayout>
      <div className="container mx-auto max-w-7xl px-6 flex-grow py-8">
        <div className="mb-6" />

        {/* 所有复杂的逻辑都在组件内部处理 */}
        <LibraryCatalog />
      </div>
    </DefaultLayout>
  );
}
