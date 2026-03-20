import React, { useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { getErrorMessage, isUnauthorizedError } from "../../services/http";
import { publicService } from "../../services/public";
import { userService } from "../../services/user";
import type { ApiHomePageDto } from "../../types/api";
import type { UserOverview } from "../../types/user";
import { subscribeAppEvent } from "../../utils/events";

interface UseHomeDataOptions {
  user: { username: string; fullName?: string } | null;
  signOut: () => Promise<void>;
}

export function useHomeData({ user, signOut }: UseHomeDataOptions) {
  const [homeData, setHomeData] = useState<ApiHomePageDto | null>(null);
  const [overview, setOverview] = useState<UserOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const [nextHomeData, nextOverview] = await Promise.all([
        publicService.getHomePage(),
        user
          ? userService.getMyOverview().catch(async (error) => {
              if (isUnauthorizedError(error)) {
                await signOut();
                return null;
              }

              return null;
            })
          : Promise.resolve(null),
      ]);

      setHomeData(nextHomeData);
      setOverview(nextOverview);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "首页数据加载失败"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      void loadData(true);
      return undefined;
    }, [user]),
  );

  useEffect(() => {
    return subscribeAppEvent((event) => {
      if (event === "auth" || event === "overview" || event === "books") {
        void loadData(true);
      }
    });
  }, [user]);

  return {
    homeData,
    overview,
    loading,
    refreshing,
    errorMessage,
    loadData,
  };
}
