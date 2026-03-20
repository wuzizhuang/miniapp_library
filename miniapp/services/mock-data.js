/**
 * Mock data for offline demo fallback.
 * Provides realistic Chinese-language library data for all libraryService methods.
 */

// ─── Shared entities ───────────────────────────────────────────────

const DEMO_USER = {
  userId: 1001,
  username: 'zhangsan',
  email: 'zhangsan@scau.edu.cn',
  fullName: '张三',
  role: 'USER',
  roles: ['USER'],
  permissions: [],
  identityType: '本科生',
  department: '计算机科学与技术学院',
  major: '软件工程',
  enrollmentYear: 2022,
  interestTags: ['人工智能', '数据结构', '文学', 'Java'],
}

const DEMO_BOOKS = [
  {
    id: 1, title: '深入理解计算机系统', author: 'Randal E. Bryant', isbn: '978-7-111-54493-7',
    publisher: '机械工业出版社', publishYear: 2016, language: 'zh-CN', categoryId: 1,
    categoryName: '计算机科学', totalCount: 5, availableCount: 2,
    cover: '', description: '从程序员视角全面剖析计算机系统，涵盖数据表示、汇编语言、存储器层次、链接、异常控制流、虚拟存储器、系统级 I/O 等核心主题。',
  },
  {
    id: 2, title: '算法导论', author: 'Thomas H. Cormen', isbn: '978-7-111-40701-0',
    publisher: '机械工业出版社', publishYear: 2012, language: 'zh-CN', categoryId: 1,
    categoryName: '计算机科学', totalCount: 8, availableCount: 3,
    cover: '', description: '系统介绍了各种算法的设计方法与分析技巧，是计算机算法领域的经典教材。',
  },
  {
    id: 3, title: '百年孤独', author: '加西亚·马尔克斯', isbn: '978-7-5442-4528-8',
    publisher: '南海出版公司', publishYear: 2011, language: 'zh-CN', categoryId: 2,
    categoryName: '文学', totalCount: 4, availableCount: 1,
    cover: '', description: '魔幻现实主义文学代表作，讲述布恩迪亚家族七代人的传奇故事。',
  },
  {
    id: 4, title: '数据库系统概论', author: '王珊', isbn: '978-7-04-044425-1',
    publisher: '高等教育出版社', publishYear: 2014, language: 'zh-CN', categoryId: 1,
    categoryName: '计算机科学', totalCount: 10, availableCount: 5,
    cover: '', description: '数据库领域经典教材，全面介绍关系数据库理论和数据库设计方法。',
  },
  {
    id: 5, title: '三体', author: '刘慈欣', isbn: '978-7-229-03093-3',
    publisher: '重庆出版社', publishYear: 2008, language: 'zh-CN', categoryId: 3,
    categoryName: '科幻', totalCount: 6, availableCount: 0,
    cover: '', description: '中国科幻文学里程碑之作，以宏大的宇宙视角展现文明间的博弈。',
  },
  {
    id: 6, title: 'Spring Boot 实战', author: '克雷格·沃尔斯', isbn: '978-7-115-45301-9',
    publisher: '人民邮电出版社', publishYear: 2016, language: 'zh-CN', categoryId: 1,
    categoryName: '计算机科学', totalCount: 3, availableCount: 2,
    cover: '', description: '全面介绍 Spring Boot 框架的实践指南，示范如何快速构建可部署应用。',
  },
]

const DEMO_CATEGORIES = [
  { categoryId: 1, name: '计算机科学', bookCount: 42 },
  { categoryId: 2, name: '文学', bookCount: 28 },
  { categoryId: 3, name: '科幻', bookCount: 15 },
  { categoryId: 4, name: '经济管理', bookCount: 20 },
  { categoryId: 5, name: '自然科学', bookCount: 18 },
]

const now = new Date()
const dayMs = 86400000
function dateStr(offset) {
  return new Date(now.getTime() + offset * dayMs).toISOString().slice(0, 19)
}

// ─── Mock method implementations ───────────────────────────────────

const mockData = {
  // ── Session ──────────────────────────────────────────────────────
  login() {
    return {
      token: 'mock-token-offline-demo',
      refreshToken: 'mock-refresh-token',
      user: { ...DEMO_USER },
    }
  },

  bootstrapFromToken() {
    return {
      token: 'mock-token-offline-demo',
      refreshToken: 'mock-refresh-token',
      user: { ...DEMO_USER },
    }
  },

  register() {
    return mockData.login()
  },

  requestPasswordReset() {
    return { message: '重置链接已发送至邮箱' }
  },

  getHomePage() {
    return {
      heroStats: [
        { label: '总馆藏', value: 12860 },
        { label: '在馆可借', value: 8432 },
        { label: '今日借出', value: 47 },
        { label: '活跃读者', value: 1356 },
      ],
      featuredBooks: DEMO_BOOKS.slice(0, 4).map((b) => ({
        id: b.id, title: b.title, author: b.author, cover: b.cover,
        tag: b.categoryName,
      })),
      categories: DEMO_CATEGORIES.map((c) => ({
        categoryId: c.categoryId, label: c.name, count: c.bookCount,
      })),
    }
  },

  getMyProfile() {
    return { ...DEMO_USER }
  },

  updateProfile() {
    wx.showToast({ title: '[演示模式] 资料已保存', icon: 'none' })
    return { ...DEMO_USER }
  },

  getMyOverview() {
    return {
      activeLoanCount: 2,
      readyReservationCount: 1,
      unreadNotificationCount: 3,
      pendingFineCount: 1,
    }
  },

  // ── Catalog ──────────────────────────────────────────────────────
  getCatalog() {
    return {
      categories: DEMO_CATEGORIES,
      suggestions: ['计算机', '算法', '数据库', '文学', '三体'],
      hotKeywords: ['深入理解', 'Spring Boot', '三体', '百年孤独'],
      searchHistory: ['Java', '数据结构'],
      books: DEMO_BOOKS,
      favoriteBookIds: [1, 3],
      loanBookIds: [1, 4],
      reservationBookIds: [5],
    }
  },

  getBookDetail(bookId) {
    const book = DEMO_BOOKS.find((b) => b.id === Number(bookId)) || DEMO_BOOKS[0]
    return {
      book,
      reviews: [
        {
          reviewId: 101, userId: 1002, username: '李四', userFullName: '李四',
          bookId: book.id, bookTitle: book.title, bookIsbn: book.isbn,
          rating: 5, commentText: '非常好的一本书，推荐阅读！',
          status: 'APPROVED', createTime: dateStr(-10),
        },
        {
          reviewId: 102, userId: 1003, username: '王五', userFullName: '王五',
          bookId: book.id, bookTitle: book.title, bookIsbn: book.isbn,
          rating: 4, commentText: '内容详实，适合深入学习。',
          status: 'APPROVED', createTime: dateStr(-5),
        },
      ],
      isFavorite: [1, 3].includes(book.id),
      availableLocations: ['A 区 3 楼 书架 CS-12', 'B 区 2 楼 书架 CS-08'],
      activeLoan: book.id === 1 ? {
        loanId: 201, bookId: 1, bookTitle: book.title,
        status: 'ACTIVE', borrowDate: dateStr(-14), dueDate: dateStr(16),
        renewCount: 0, maxRenewals: 2,
      } : null,
      activeReservation: book.id === 5 ? {
        reservationId: 301, bookId: 5, bookTitle: '三体',
        status: 'PENDING', reserveDate: dateStr(-3), expiryDate: dateStr(11),
        queuePosition: 2,
      } : null,
    }
  },

  toggleFavorite() {
    wx.showToast({ title: '[演示模式] 收藏已切换', icon: 'none' })
    return true
  },

  borrowBook() {
    wx.showToast({ title: '[演示模式] 借阅成功', icon: 'none' })
    return { loanId: 999, status: 'ACTIVE', borrowDate: dateStr(0), dueDate: dateStr(30) }
  },

  reserveBook() {
    wx.showToast({ title: '[演示模式] 预约成功', icon: 'none' })
    return { reservationId: 999, status: 'PENDING', queuePosition: 1 }
  },

  submitReview() {
    wx.showToast({ title: '[演示模式] 评论已提交', icon: 'none' })
    return { reviewId: 999, status: 'PENDING' }
  },

  getShelf() {
    return {
      favorites: DEMO_BOOKS.filter((b) => [1, 3, 6].includes(b.id)),
      activeLoans: [
        {
          loanId: 201, bookId: 1, bookTitle: '深入理解计算机系统', author: 'Bryant',
          status: 'ACTIVE', borrowDate: dateStr(-14), dueDate: dateStr(16), renewCount: 0,
        },
        {
          loanId: 202, bookId: 4, bookTitle: '数据库系统概论', author: '王珊',
          status: 'ACTIVE', borrowDate: dateStr(-7), dueDate: dateStr(23), renewCount: 0,
        },
      ],
      historyLoans: [
        {
          loanId: 101, bookId: 2, bookTitle: '算法导论', author: 'Cormen',
          status: 'RETURNED', borrowDate: dateStr(-60), dueDate: dateStr(-30), returnDate: dateStr(-32),
        },
        {
          loanId: 102, bookId: 3, bookTitle: '百年孤独', author: '马尔克斯',
          status: 'RETURNED', borrowDate: dateStr(-90), dueDate: dateStr(-60), returnDate: dateStr(-62),
        },
        {
          loanId: 103, bookId: 6, bookTitle: 'Spring Boot 实战', author: '沃尔斯',
          status: 'RETURNED', borrowDate: dateStr(-120), dueDate: dateStr(-90), returnDate: dateStr(-95),
        },
      ],
    }
  },

  getLoanById(loanId) {
    const loans = [...mockData.getShelf().activeLoans, ...mockData.getShelf().historyLoans]
    return loans.find((l) => l.loanId === Number(loanId)) || loans[0]
  },

  renewLoan() {
    wx.showToast({ title: '[演示模式] 续借成功', icon: 'none' })
    return { success: true }
  },

  returnLoan() {
    wx.showToast({ title: '[演示模式] 还书成功', icon: 'none' })
    return { success: true }
  },

  getReservations() {
    return [
      {
        reservationId: 301, bookId: 5, bookTitle: '三体', author: '刘慈欣',
        status: 'PENDING', reserveDate: dateStr(-3), expiryDate: dateStr(11), queuePosition: 2,
      },
      {
        reservationId: 302, bookId: 2, bookTitle: '算法导论', author: 'Cormen',
        status: 'AWAITING_PICKUP', reserveDate: dateStr(-10), expiryDate: dateStr(4), queuePosition: 0,
      },
      {
        reservationId: 303, bookId: 6, bookTitle: 'Spring Boot 实战', author: '沃尔斯',
        status: 'CANCELLED', reserveDate: dateStr(-20), expiryDate: dateStr(-6), queuePosition: 0,
      },
    ]
  },

  cancelReservation() {
    wx.showToast({ title: '[演示模式] 预约已取消', icon: 'none' })
    return { success: true }
  },

  // ── Support ──────────────────────────────────────────────────────
  getNotifications() {
    return [
      {
        notificationId: 401, title: '归还提醒', type: 'LOAN_DUE',
        content: '《深入理解计算机系统》将于 3 天后到期，请及时归还。',
        createTime: dateStr(-1), read: false,
        targetUrl: '/pages/my/loan-tracking/index?loanId=201',
      },
      {
        notificationId: 402, title: '预约到书', type: 'RESERVATION_READY',
        content: '您预约的《算法导论》已到馆，请在 7 日内前往取书。',
        createTime: dateStr(-2), read: false,
        targetUrl: '/pages/my/reservations/index?highlight=302',
      },
      {
        notificationId: 403, title: '罚款通知', type: 'FINE_CREATED',
        content: '因逾期归还产生罚款 ¥2.00，请及时处理。',
        createTime: dateStr(-5), read: false,
        targetUrl: '/pages/my/fines/index',
      },
      {
        notificationId: 404, title: '系统公告', type: 'SYSTEM',
        content: '图书馆将于本周六进行系统升级维护，届时暂停借还服务。',
        createTime: dateStr(-7), read: true,
      },
    ]
  },

  markNotificationRead() {
    return { success: true }
  },

  markAllNotificationsRead() {
    return { success: true }
  },

  deleteNotification() {
    return { success: true }
  },

  clearReadNotifications() {
    return { success: true }
  },

  getFines() {
    return [
      {
        fineId: 501, loanId: 103, bookTitle: 'Spring Boot 实战',
        amount: 2.00, reason: '逾期归还', status: 'PENDING',
        createTime: dateStr(-5), paidTime: null,
      },
      {
        fineId: 502, loanId: 102, bookTitle: '百年孤独',
        amount: 1.50, reason: '逾期归还', status: 'PAID',
        createTime: dateStr(-30), paidTime: dateStr(-28),
      },
    ]
  },

  payFine() {
    wx.showToast({ title: '[演示模式] 支付成功', icon: 'none' })
    return { success: true }
  },

  getFeedback() {
    return [
      {
        feedbackId: 601, category: 'SUGGESTION', subject: '建议增加自习室预约',
        content: '希望能在小程序中预约自习室座位。', contactEmail: 'zhangsan@scau.edu.cn',
        status: 'REPLIED', createTime: dateStr(-15),
        reply: '感谢您的建议，座位预约功能已上线，请在"我的"页面查看。',
      },
      {
        feedbackId: 602, category: 'BUG', subject: '搜索结果排序问题',
        content: '按时间排序时结果不太准确。', contactEmail: 'zhangsan@scau.edu.cn',
        status: 'PENDING', createTime: dateStr(-3),
      },
    ]
  },

  submitFeedback() {
    wx.showToast({ title: '[演示模式] 反馈已提交', icon: 'none' })
    return { feedbackId: 999, status: 'PENDING' }
  },

  // ── Reviews ──────────────────────────────────────────────────────
  getMyReviews() {
    return {
      content: [
        {
          reviewId: 701, userId: DEMO_USER.userId, username: DEMO_USER.username,
          userFullName: DEMO_USER.fullName,
          bookId: 1, bookTitle: '深入理解计算机系统', bookIsbn: '978-7-111-54493-7',
          rating: 5, commentText: '每一章都值得反复阅读，强烈推荐！',
          status: 'APPROVED', createTime: dateStr(-20),
        },
        {
          reviewId: 702, userId: DEMO_USER.userId, username: DEMO_USER.username,
          userFullName: DEMO_USER.fullName,
          bookId: 3, bookTitle: '百年孤独', bookIsbn: '978-7-5442-4528-8',
          rating: 4, commentText: '文笔优美，情节引人入胜。',
          status: 'PENDING', createTime: dateStr(-8),
        },
      ],
    }
  },

  updateReview() {
    wx.showToast({ title: '[演示模式] 评论已更新', icon: 'none' })
    return { success: true }
  },

  deleteReview() {
    wx.showToast({ title: '[演示模式] 评论已删除', icon: 'none' })
    return { success: true }
  },

  // ── Search History ───────────────────────────────────────────────
  getSearchHistory() {
    return {
      content: [
        { keyword: 'Java', searchTime: dateStr(-1) },
        { keyword: '数据结构', searchTime: dateStr(-2) },
        { keyword: '三体', searchTime: dateStr(-3) },
        { keyword: 'Spring Boot', searchTime: dateStr(-5) },
        { keyword: '百年孤独', searchTime: dateStr(-7) },
      ],
    }
  },

  getHotKeywords() {
    return ['深入理解计算机系统', 'Spring Boot', '三体', '百年孤独', '算法导论', 'Python', '机器学习', '设计模式']
  },

  // ── Appointments ─────────────────────────────────────────────────
  getAppointments() {
    return [
      {
        appointmentId: 801, serviceType: 'BOOK_PICKUP', method: 'ONSITE',
        scheduledTime: dateStr(2), status: 'PENDING',
        notes: '取《算法导论》', loanId: null, returnLocation: null,
        createTime: dateStr(-1),
      },
      {
        appointmentId: 802, serviceType: 'CONSULTATION', method: 'ONLINE',
        scheduledTime: dateStr(5), status: 'CONFIRMED',
        notes: '咨询论文查重服务', loanId: null, returnLocation: null,
        createTime: dateStr(-3),
      },
    ]
  },

  getActiveLoans() {
    return mockData.getShelf().activeLoans
  },

  createAppointment() {
    wx.showToast({ title: '[演示模式] 预约已创建', icon: 'none' })
    return { appointmentId: 999, status: 'PENDING' }
  },

  cancelAppointment() {
    wx.showToast({ title: '[演示模式] 预约已取消', icon: 'none' })
    return { success: true }
  },

  // ── Seat Reservations ────────────────────────────────────────────
  getSeats() {
    return [
      { seatId: 1, seatNumber: 'A-101', floorName: '3楼', zoneName: '安静区', status: 'AVAILABLE', tags: ['靠窗', '电源'] },
      { seatId: 2, seatNumber: 'A-102', floorName: '3楼', zoneName: '安静区', status: 'AVAILABLE', tags: ['电源'] },
      { seatId: 3, seatNumber: 'B-201', floorName: '2楼', zoneName: '讨论区', status: 'AVAILABLE', tags: ['大桌'] },
      { seatId: 4, seatNumber: 'B-202', floorName: '2楼', zoneName: '讨论区', status: 'OCCUPIED', tags: [] },
      { seatId: 5, seatNumber: 'C-301', floorName: '1楼', zoneName: '多媒体区', status: 'AVAILABLE', tags: ['电脑', '耳机'] },
    ]
  },

  getMySeatReservations() {
    return [
      {
        reservationId: 901, seatId: 1, seatNumber: 'A-101', floorName: '3楼', zoneName: '安静区',
        startTime: dateStr(0), endTime: dateStr(0).slice(0, 11) + '18:00:00',
        status: 'ACTIVE', notes: '准备期末复习',
      },
      {
        reservationId: 902, seatId: 3, seatNumber: 'B-201', floorName: '2楼', zoneName: '讨论区',
        startTime: dateStr(-7), endTime: dateStr(-7).slice(0, 11) + '16:00:00',
        status: 'COMPLETED', notes: '小组讨论',
      },
    ]
  },

  createSeatReservation() {
    wx.showToast({ title: '[演示模式] 座位已预约', icon: 'none' })
    return { reservationId: 999, status: 'ACTIVE' }
  },

  cancelSeatReservation() {
    wx.showToast({ title: '[演示模式] 座位预约已取消', icon: 'none' })
    return { success: true }
  },

  // ── Recommendations ──────────────────────────────────────────────
  getRecommendations() {
    return [
      {
        postId: 1001, authorUserId: 2001, authorName: '刘老师',
        bookId: 1, bookTitle: '深入理解计算机系统', bookAuthor: 'Bryant',
        content: '本科阶段最值得精读的计算机基础书籍，强烈推荐每位同学阅读。',
        likeCount: 23, likedByMe: false, followingAuthor: false,
        createTime: dateStr(-12),
      },
      {
        postId: 1002, authorUserId: 2002, authorName: '陈老师',
        bookId: 5, bookTitle: '三体', bookAuthor: '刘慈欣',
        content: '拓展视野的优秀科幻作品，其中的博弈论和技术伦理思考值得深思。',
        likeCount: 15, likedByMe: true, followingAuthor: true,
        createTime: dateStr(-8),
      },
      {
        postId: 1003, authorUserId: DEMO_USER.userId, authorName: DEMO_USER.fullName,
        bookId: 6, bookTitle: 'Spring Boot 实战', bookAuthor: '沃尔斯',
        content: '做毕设的时候参考了这本书，对入门 Spring Boot 帮助很大。',
        likeCount: 5, likedByMe: false, followingAuthor: false,
        createTime: dateStr(-3),
      },
    ]
  },

  searchBooks(keyword) {
    const kw = String(keyword || '').toLowerCase()
    const filtered = DEMO_BOOKS.filter(
      (b) => b.title.toLowerCase().includes(kw) || b.author.toLowerCase().includes(kw)
    )
    return filtered.length > 0 ? filtered : DEMO_BOOKS.slice(0, 3)
  },

  createRecommendation() {
    wx.showToast({ title: '[演示模式] 推荐已发布', icon: 'none' })
    return { postId: 999 }
  },

  toggleRecommendationLike() {
    wx.showToast({ title: '[演示模式] 点赞已切换', icon: 'none' })
    return true
  },

  toggleRecommendationFollow() {
    wx.showToast({ title: '[演示模式] 关注已切换', icon: 'none' })
    return true
  },

  deleteRecommendation() {
    wx.showToast({ title: '[演示模式] 推荐已删除', icon: 'none' })
    return { success: true }
  },
}

module.exports = { mockData }
