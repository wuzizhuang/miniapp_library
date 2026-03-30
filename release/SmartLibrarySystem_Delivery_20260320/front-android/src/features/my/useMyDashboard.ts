import React, { useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { getErrorMessage, isUnauthorizedError } from "../../services/http";
import { userService } from "../../services/user";
import type { ApiUserProfileDto } from "../../types/api";
import type { UserOverview } from "../../types/user";
import { subscribeAppEvent } from "../../utils/events";

interface UseMyDashboardOptions {
  user: { username: string } | null;
  signOut: () => Promise<void>;
}

export function useMyDashboard({ user, signOut }: UseMyDashboardOptions) {
  const [profile, setProfile] = useState<ApiUserProfileDto | null>(null);
  const [overview, setOverview] = useState<UserOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData(isRefresh = false) {
    if (!user) {
      setProfile(null);
      setOverview(null);
      setLoading(false);
      setRefreshing(false);
      setErrorMessage("");
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const [nextProfile, nextOverview] = await Promise.all([
        userService.getMyProfile(),
        userService.getMyOverview(),
      ]);
      setProfile(nextProfile);
      setOverview(nextOverview);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await signOut();
        return;
      }

      setErrorMessage(getErrorMessage(error, "个人中心数据加载失败"));
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
      if (!user) {
        return undefined;
      }

      void loadData(true);
      return undefined;
    }, [user]),
  );

  useEffect(() => {
    return subscribeAppEvent((event) => {
      if (event === "auth" || event === "overview" || event === "profile") {
        void loadData(true);
      }
    });
  }, [user]);

  return {
    profile,
    overview,
    loading,
    refreshing,
    errorMessage,
    loadData,
  };
}
