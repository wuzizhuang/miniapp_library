import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Icon } from "@iconify/react";
import {
  Card,
  CardBody,
  Divider,
  Chip,
  Button,
  Modal,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Skeleton,
} from "@heroui/react";
import { toast } from "sonner";

import { AppImage } from "@/components/common/AppImage";
import { RequestErrorCard } from "@/components/common/RequestErrorCard";
import DefaultLayout from "@/components/layouts/default";
import { BookLocationMapCard } from "@/components/modules/books/BookLocationMapCard";
import { ReviewSection } from "@/components/modules/books/ReviewSection";
import { useAuth } from "@/config/authContext";
import { getApiErrorMessage } from "@/lib/apiError";
import { behaviorLogService } from "@/services/api/behaviorLogService";
import { bookLocationMapService } from "@/services/api/bookLocationMapService";
import { bookService } from "@/services/api/bookService";
import { bookCopyService } from "@/services/api/bookCopyService";
import { favoriteService } from "@/services/api/favoriteService";
import { loanService } from "@/services/api/loanService";
import { reservationService } from "@/services/api/reservationService";

/**
 * 将后端或网络错误翻译成更贴近读者语言的操作提示。
 */
function getActionErrorMessage(error: any, fallback: string): string {
  const rawMessage = getApiErrorMessage(error, fallback).trim();

  if (!rawMessage) {
    return fallback;
  }

  if (rawMessage.includes("pending fines")) {
    return "你有未缴罚款，结清后才能继续借阅。";
  }
  if (rawMessage.includes("not available for borrowing")) {
    return "当前没有可借副本，请改为预约。";
  }
  if (rawMessage.includes("Max reservation limit")) {
    return "你的预约数量已达上限，暂时不能继续预约。";
  }
  if (rawMessage.includes("already have an active reservation")) {
    return "你已经预约过这本书了，无需重复预约。";
  }
  if (rawMessage.includes("Unauthorized")) {
    return "当前登录状态无效，请重新登录后再试。";
  }

  return rawMessage;
}

/**
 * 图书详情页。
 * 负责展示图书详情、馆藏地图、评论，以及借阅/预约/收藏等动作。
 */
export default function BookDetailPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = router.query;
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);
  const loggedBookIdRef = useRef<number | null>(null);

  const numericId = Number(id);
  // SWR key 按数据域拆分，便于单独刷新详情、副本、收藏状态等局部数据。
  const detailKey =
    router.isReady && Number.isFinite(numericId) ? ["book-detail", numericId] : null;
  const copiesKey =
    router.isReady && Number.isFinite(numericId) ? ["book-copies", numericId] : null;
  const locationMapKey =
    router.isReady && Number.isFinite(numericId) ? ["book-location-map", numericId] : null;
  const favoriteKey =
    user && router.isReady && Number.isFinite(numericId)
      ? ["book-favorite-status", numericId, user.userId]
      : null;
  const myLoansKey = user ? "book-detail-my-loans" : null;
  const myReservationsKey = user ? "book-detail-my-reservations" : null;

  const {
    data: book,
    error: detailError,
    isLoading,
    mutate: mutateBook,
  } = useSWR(detailKey, () => bookService.getBookById(numericId));
  const {
    data: copies = [],
    error: copiesError,
    mutate: mutateCopies,
  } = useSWR(copiesKey, () => bookCopyService.getByBookId(numericId));
  const {
    data: locationMap,
    error: locationMapError,
    isLoading: isLocationMapLoading,
    mutate: mutateLocationMap,
  } = useSWR(locationMapKey, () => bookLocationMapService.getByBookId(numericId));
  const {
    data: isFavorite = false,
    error: favoriteError,
    isLoading: favoriteLoading,
    mutate: mutateFavoriteStatus,
  } = useSWR(favoriteKey, () => favoriteService.checkFavorite(numericId));
  const { data: myLoans = [], error: myLoansError, mutate: mutateMyLoans } = useSWR(
    myLoansKey,
    loanService.getMyLoans,
  );
  const {
    data: myReservations = [],
    error: myReservationsError,
    mutate: mutateMyReservations,
  } = useSWR(
    myReservationsKey,
    reservationService.getMyReservations,
  );

  const availableCopy = useMemo(
    () => copies.find((copy) => copy.status === "AVAILABLE"),
    [copies],
  );
  const availableLocations = useMemo(() => {
    const locations = copies
      .filter((copy) => copy.status === "AVAILABLE" && !!copy.locationCode)
      .map((copy) => copy.locationCode!.trim())
      .filter(Boolean);

    return Array.from(new Set(locations)).sort((a, b) => a.localeCompare(b));
  }, [copies]);
  const onlineAccessTypeLabel = useMemo(() => {
    if (book?.onlineAccessType === "OPEN_ACCESS") return "公开访问";
    if (book?.onlineAccessType === "CAMPUS_ONLY") return "校园网访问";
    if (book?.onlineAccessType === "LICENSED_ACCESS") return "授权访问";

    return "未标注";
  }, [book?.onlineAccessType]);

  const activeLoanForBook = useMemo(
    () =>
      myLoans.find(
        (loan) =>
          loan.bookId === numericId &&
          (loan.status === "BORROWED" || loan.status === "OVERDUE"),
      ),
    [myLoans, numericId],
  );
  const activeReservationForBook = useMemo(
    () =>
      myReservations.find(
        (reservation) =>
          reservation.bookId === numericId &&
          (reservation.status === "PENDING" || reservation.status === "AWAITING_PICKUP"),
      ),
    [myReservations, numericId],
  );

  const author = book?.authorNames?.join(", ") || "-";
  const isAvailable = (book?.availableCount || 0) > 0 && !!availableCopy;
  const chipColor = activeLoanForBook ? "primary" : isAvailable ? "success" : "warning";
  const chipLabel = activeLoanForBook
    ? "已借到手"
    : activeReservationForBook?.status === "AWAITING_PICKUP"
      ? "预约待取"
      : activeReservationForBook
        ? "已在预约"
        : isAvailable
          ? "目前在馆"
          : "已借出";

  /**
   * 未登录时统一带上当前详情页地址，登录后可以原路返回。
   */
  const redirectToLogin = async () => {
    await router.push({
      pathname: "/auth/login",
      query: { redirect: router.asPath || `/books/${numericId}` },
    });
  };

  /**
   * 优先返回站内来源页，缺失时回退到图书目录。
   */
  const handleBack = async () => {
    if (typeof window !== "undefined" && document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);

        if (referrerUrl.origin === window.location.origin) {
          router.back();

          return;
        }
      } catch {
        // Ignore invalid referrer and fall back to the book list.
      }
    }

    await router.push("/books");
  };

  /**
   * 刷新图书详情页相关依赖。
   * 借阅、预约、收藏成功后，会把多个读者中心与首页卡片一起重新校验。
   */
  const refreshDetailDependencies = async () => {
    await Promise.all([
      mutateBook(),
      mutateCopies(),
      mutateLocationMap(),
      mutateMyLoans(),
      mutateMyReservations(),
      mutateFavoriteStatus(),
      globalMutate("my-active-loans-shelf"),
      globalMutate("my-history-loans-shelf"),
      globalMutate("my-favorites-shelf"),
      globalMutate("my-loans-profile"),
      globalMutate("my-overview"),
      globalMutate("homepage-my-overview"),
      globalMutate("my-reservations"),
      globalMutate("notification-unread-count"),
      globalMutate(
        (key) => Array.isArray(key) && key[0] === "my-notifications-page",
        undefined,
        { revalidate: true },
      ),
      globalMutate(
        (key) => Array.isArray(key) && key[0] === "my-reservations-page",
        undefined,
        { revalidate: true },
      ),
      globalMutate(
        (key) => Array.isArray(key) && key[0] === "/api/books",
        undefined,
        { revalidate: true },
      ),
    ]);
  };

  useEffect(() => {
    if (!book?.bookId || loggedBookIdRef.current === book.bookId) {
      return;
    }

    // 只在首次进入该图书详情时记录一次浏览行为，避免重复刷新造成脏数据。
    loggedBookIdRef.current = book.bookId;
    void behaviorLogService.logBookAction({
      bookId: book.bookId,
      actionType: "VIEW_DETAIL",
    }).catch(() => undefined);
  }, [book?.bookId]);

  /**
   * 借阅当前图书的一个可借副本。
   */
  const handleBorrow = async () => {
    if (!user) {
      toast.info("请先登录后再借阅");
      await redirectToLogin();

      return;
    }

    if (!availableCopy) {
      toast.error("当前没有可借副本，请改为预约。");

      return;
    }

    try {
      setIsBorrowing(true);
      await loanService.createLoan(availableCopy.id);
      void behaviorLogService.logBookAction({
        bookId: numericId,
        actionType: "BORROW_BOOK",
      }).catch(() => undefined);
      toast.success(`《${book?.title || ""}》借阅成功`);
      await refreshDetailDependencies();
    } catch (error: any) {
      toast.error(getActionErrorMessage(error, "借阅失败，请稍后重试"));
    } finally {
      setIsBorrowing(false);
    }
  };

  /**
   * 切换收藏状态。
   */
  const handleToggleFavorite = async () => {
    if (!user) {
      toast.info("请先登录后再收藏");
      await redirectToLogin();

      return;
    }

    try {
      setIsTogglingFavorite(true);
      if (isFavorite) {
        await favoriteService.removeFavorite(numericId);
        await mutateFavoriteStatus(false, false);
        toast.success("已取消收藏");
      } else {
        await favoriteService.addFavorite(numericId);
        void behaviorLogService.logBookAction({
          bookId: numericId,
          actionType: "ADD_TO_SHELF",
        }).catch(() => undefined);
        await mutateFavoriteStatus(true, false);
        toast.success("已加入收藏");
      }
      await globalMutate("my-favorites-shelf");
    } catch (error: any) {
      toast.error(getActionErrorMessage(error, "收藏操作失败，请稍后重试"));
      await mutateFavoriteStatus();
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  /**
   * 打开预约确认弹窗。
   */
  const openReservationModal = async () => {
    if (!user) {
      toast.info("请先登录后再预约");
      await redirectToLogin();

      return;
    }

    setIsReserveModalOpen(true);
  };

  /**
   * 确认提交预约。
   */
  const handleConfirmReservation = async () => {
    try {
      setIsSubmittingReservation(true);
      await reservationService.createReservation(numericId);
      void behaviorLogService.logBookAction({
        bookId: numericId,
        actionType: "RESERVE_BOOK",
      }).catch(() => undefined);
      setIsReserveModalOpen(false);
      toast.success("预约成功，请在“我的预约”中查看最新状态");
      await refreshDetailDependencies();
    } catch (error: any) {
      toast.error(getActionErrorMessage(error, "预约失败，请稍后重试"));
    } finally {
      setIsSubmittingReservation(false);
    }
  };

  if (!router.isReady) return null;

  const requestError =
    detailError ??
    copiesError ??
    favoriteError ??
    myLoansError ??
    myReservationsError;

  return (
    <DefaultLayout>
      <section className="mx-auto w-full max-w-5xl px-2 py-6 md:px-4">
        <div className="mb-5 flex items-center gap-2 text-sm text-slate-400">
          <button
            className="flex items-center gap-1 transition hover:text-sky-300"
            onClick={() => {
              void handleBack();
            }}
          >
            <Icon icon="solar:arrow-left-linear" /> 返回
          </button>
          <span>/</span>
          <span className="font-medium text-slate-200">
            {book?.title || "图书详情"}
          </span>
        </div>

        {requestError ? (
          <RequestErrorCard
            message={getApiErrorMessage(requestError, "图书详情加载失败，请稍后重试。")}
            title="图书详情加载失败"
            onRetry={() => {
              void refreshDetailDependencies();
            }}
          />
        ) : (
        <Card
          className="w-full border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(8,15,30,0.84))] text-white shadow-[0_28px_80px_-40px_rgba(2,6,23,0.92)]"
          radius="lg"
          shadow="sm"
        >
          <CardBody className="overflow-visible p-6 md:p-7">
            <Skeleton className="rounded-2xl" isLoaded={!isLoading}>
              <div className="flex flex-col md:flex-row gap-8">
                <div className="shrink-0">
                  <AppImage
                    alt={book?.title || "Book"}
                    className="object-cover shadow-2xl"
                    height={360}
                    src={book?.coverUrl}
                    width={240}
                    wrapperClassName="aspect-[2/3] rounded-xl"
                  />
                </div>

                <div className="flex flex-col flex-1">
                  <div className="mb-2">
                    <div className="flex justify-between items-start">
                      <h1 className="text-3xl font-bold text-white">
                        {book?.title || "-"}
                      </h1>
                      <Chip className="capitalize" color={chipColor} variant="flat">
                        {chipLabel}
                      </Chip>
                    </div>
                    <p className="mt-1 text-xl text-slate-300">{author}</p>
                  </div>

                  <Divider className="my-4 bg-white/8" />

                  <div className="flex flex-wrap gap-4 mb-6">
                    {activeLoanForBook ? (
                      <Button
                        className="font-bold px-8 shadow-lg shadow-blue-200"
                        color="primary"
                        size="lg"
                        startContent={<Icon icon="solar:book-bookmark-bold" width={24} />}
                        onPress={() => router.push(`/my/loan-tracking/${activeLoanForBook.loanId}`)}
                      >
                        查看我的借阅
                      </Button>
                    ) : isAvailable ? (
                      <Button
                        className="font-bold px-8 shadow-lg shadow-blue-200"
                        color="primary"
                        isLoading={isBorrowing}
                        size="lg"
                        startContent={
                          !isBorrowing ? (
                            <Icon icon="solar:book-bookmark-bold" width={24} />
                          ) : undefined
                        }
                        onPress={handleBorrow}
                      >
                        立即借阅
                      </Button>
                    ) : (
                      <Button
                        className="font-bold px-8 text-white"
                        color="warning"
                        isDisabled={!!activeReservationForBook}
                        size="lg"
                        startContent={<Icon icon="solar:calendar-add-bold" width={24} />}
                        variant="shadow"
                        onPress={openReservationModal}
                      >
                        {activeReservationForBook ? "已预约" : "预约取书"}
                      </Button>
                    )}

                    <Button
                      isLoading={favoriteLoading || isTogglingFavorite}
                      size="lg"
                      startContent={
                        !favoriteLoading && !isTogglingFavorite ? (
                          <Icon
                            icon={isFavorite ? "solar:heart-bold" : "solar:heart-linear"}
                            width={24}
                          />
                        ) : undefined
                      }
                      variant={isFavorite ? "solid" : "bordered"}
                      color={isFavorite ? "danger" : "default"}
                      onPress={handleToggleFavorite}
                    >
                      {isFavorite ? "取消收藏" : "收藏"}
                    </Button>
                  </div>

                  {activeReservationForBook ? (
                    <div className="mb-6 rounded-[20px] border border-amber-300/20 bg-[linear-gradient(135deg,rgba(120,53,15,0.42),rgba(69,26,3,0.28))] p-4 text-sm text-amber-100">
                      当前预约状态：
                      {activeReservationForBook.status === "AWAITING_PICKUP"
                        ? "图书已为你预留，请尽快前往取书。"
                        : "已进入预约队列，请留意后续通知。"}
                    </div>
                  ) : null}

                  <div className="mb-6 grid grid-cols-2 gap-4 rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.78),rgba(30,41,59,0.62))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_40px_-30px_rgba(15,23,42,0.85)] backdrop-blur md:grid-cols-4">
                    {/* 核心书目信息浓缩成四张信息卡，方便移动端快速扫描。 */}
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase font-semibold tracking-[0.16em] text-slate-400">
                        ISBN
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-100">{book?.isbn || "-"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase font-semibold tracking-[0.16em] text-slate-400">
                        Language
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-100">{book?.language || "-"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase font-semibold tracking-[0.16em] text-slate-400">
                        Category
                      </p>
                      <p className="mt-2 truncate text-sm font-semibold text-slate-100">
                        {book?.categoryNames?.join(", ") || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase font-semibold tracking-[0.16em] text-slate-400">
                        Available
                      </p>
                      <p className="mt-2 text-sm font-semibold text-emerald-300">
                        {book?.availableCount ?? 0} 本
                      </p>
                    </div>
                  </div>

                  <div className="mb-6 rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(17,24,39,0.72))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_40px_-30px_rgba(15,23,42,0.8)]">
                    <h3 className="mb-3 text-base font-semibold text-slate-100">线上与馆藏联动</h3>
                    {/* 同时展示实体馆藏与线上访问入口，帮助读者快速判断借阅或在线阅读路径。 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                        <Icon
                          className="text-slate-400"
                          icon="solar:map-point-bold"
                          width={18}
                        />
                        <span className="text-slate-400">可借位置:</span>
                        <span className="font-medium text-slate-100">
                          {availableLocations.length > 0
                            ? availableLocations.join(" / ")
                            : "暂未标注"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                        <Icon
                          className="text-slate-400"
                          icon="solar:global-bold"
                          width={18}
                        />
                        <span className="text-slate-400">线上访问:</span>
                        {book?.onlineAccessUrl ? (
                          <a
                            className="font-medium text-sky-300 underline decoration-sky-400/70 underline-offset-4"
                            href={book.onlineAccessUrl}
                            rel="noreferrer"
                            target="_blank"
                            onClick={() => {
                              if (!book?.bookId) {
                                return;
                              }

                              void behaviorLogService.logBookAction({
                                bookId: book.bookId,
                                actionType: "CLICK_PREVIEW",
                              }).catch(() => undefined);
                            }}
                          >
                            立即访问
                          </a>
                        ) : (
                          <span className="font-medium text-slate-100">暂无线上资源</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                        <Icon
                          className="text-slate-400"
                          icon="solar:book-2-bold"
                          width={18}
                        />
                        <span className="text-slate-400">资源形态:</span>
                        <span className="font-medium text-slate-100">
                          {book?.resourceMode || "PHYSICAL_ONLY"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                        <Icon
                          className="text-slate-400"
                          icon="solar:shield-check-bold"
                          width={18}
                        />
                        <span className="text-slate-400">访问策略:</span>
                        <span className="font-medium text-slate-100">{onlineAccessTypeLabel}</span>
                      </div>
                    </div>
                  </div>

                  <BookLocationMapCard
                    errorMessage={
                      locationMapError
                        ? getApiErrorMessage(locationMapError, "馆藏地图加载失败，请稍后重试。")
                        : undefined
                    }
                    isLoading={isLocationMapLoading}
                    map={locationMap}
                    onRetry={() => {
                      void mutateLocationMap();
                    }}
                  />

                  <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.72),rgba(30,41,59,0.52))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <h3 className="mb-2 text-lg font-bold text-white">简介</h3>
                    <p className="text-sm leading-8 text-slate-300 text-justify">
                      {book?.description || "暂无简介"}
                    </p>
                  </div>
                </div>
              </div>
            </Skeleton>
          </CardBody>
        </Card>
        )}
        {!requestError && book?.bookId ? <ReviewSection bookId={book.bookId} /> : null}
      </section>

      <Modal
        isOpen={isReserveModalOpen}
        placement="center"
        size="lg"
        onOpenChange={(open) => setIsReserveModalOpen(open)}
      >
        <ModalContent>
          <ModalHeader>确认预约</ModalHeader>
          <ModalBody className="space-y-3">
            <p className="text-sm text-default-600">
              你即将预约《{book?.title || "当前图书"}》。
            </p>
            <div className="rounded-xl border border-default-100 bg-default-50 p-4 text-sm text-default-700">
              当前可借副本为 0，本次操作会进入预约队列。若系统已经为你锁定副本，后续可在“我的预约”查看取书状态。
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={() => setIsReserveModalOpen(false)}
            >
              取消
            </Button>
            <Button
              color="warning"
              isLoading={isSubmittingReservation}
              onPress={handleConfirmReservation}
            >
              确认预约
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DefaultLayout>
  );
}
