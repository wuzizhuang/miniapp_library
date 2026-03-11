const DAY = 24 * 60 * 60 * 1000

function isoOffset(days, hours) {
  const date = new Date(Date.now() + (days || 0) * DAY + (hours || 0) * 60 * 60 * 1000)
  return date.toISOString()
}

function formatDate(value) {
  return String(value || '').slice(0, 10)
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

const baseState = {
  accounts: [
    {
      username: 'reader01',
      password: '123456',
      user: {
        userId: 101,
        username: 'reader01',
        fullName: '林知远',
        email: 'reader01@library.com',
        role: 'USER',
        roles: ['USER'],
        identityType: 'STUDENT',
        department: '计算机学院',
        major: '软件工程',
        enrollmentYear: 2022,
        interestTags: ['产品设计', '数据科学', '现代文学'],
      },
    },
  ],
  categories: [
    { categoryId: 1, name: '计算机' },
    { categoryId: 2, name: '文学' },
    { categoryId: 3, name: '设计' },
    { categoryId: 4, name: '历史' },
    { categoryId: 5, name: '商业' },
  ],
  books: [
    {
      bookId: 1,
      isbn: '9787115532452',
      title: '系统设计沉思录',
      coverUrl: 'https://picsum.photos/seed/library-book-1/240/360',
      categoryId: 1,
      categoryName: '计算机',
      categoryNames: ['计算机'],
      authorNames: ['周明远'],
      publisherName: '电子工业出版社',
      description: '围绕高并发、可观测性、数据一致性和演进式架构组织的系统设计阅读书。',
      language: '中文',
      publishYear: 2024,
      availableCount: 3,
      availableCopies: 3,
      totalCopies: 5,
      inventoryCount: 5,
      resourceMode: 'HYBRID',
      onlineAccessUrl: 'https://example.com/book/1',
      onlineAccessType: 'CAMPUS_ONLY',
      locations: ['A-3-12', 'A-3-15'],
    },
    {
      bookId: 2,
      isbn: '9787020171647',
      title: '海边图书馆',
      coverUrl: 'https://picsum.photos/seed/library-book-2/240/360',
      categoryId: 2,
      categoryName: '文学',
      categoryNames: ['文学'],
      authorNames: ['陈知夏'],
      publisherName: '人民文学出版社',
      description: '一部关于阅读记忆、归乡与公共空间的长篇小说。',
      language: '中文',
      publishYear: 2023,
      availableCount: 0,
      availableCopies: 0,
      totalCopies: 4,
      inventoryCount: 4,
      resourceMode: 'PHYSICAL_ONLY',
      onlineAccessUrl: '',
      onlineAccessType: '',
      locations: ['B-1-03'],
    },
    {
      bookId: 3,
      isbn: '9787111728880',
      title: '服务体验蓝图',
      coverUrl: 'https://picsum.photos/seed/library-book-3/240/360',
      categoryId: 3,
      categoryName: '设计',
      categoryNames: ['设计'],
      authorNames: ['宋意'],
      publisherName: '机械工业出版社',
      description: '从用户旅程、触点设计到服务协同，适合图书馆服务优化参考。',
      language: '中文',
      publishYear: 2022,
      availableCount: 2,
      availableCopies: 2,
      totalCopies: 2,
      inventoryCount: 2,
      resourceMode: 'DIGITAL_ONLY',
      onlineAccessUrl: 'https://example.com/book/3',
      onlineAccessType: 'OPEN_ACCESS',
      locations: [],
    },
    {
      bookId: 4,
      isbn: '9787108064120',
      title: '城市与档案',
      coverUrl: 'https://picsum.photos/seed/library-book-4/240/360',
      categoryId: 4,
      categoryName: '历史',
      categoryNames: ['历史'],
      authorNames: ['何绍诚'],
      publisherName: '生活·读书·新知三联书店',
      description: '从城市记忆和公共档案切入，讨论近代城市治理与知识组织。',
      language: '中文',
      publishYear: 2021,
      availableCount: 1,
      availableCopies: 1,
      totalCopies: 3,
      inventoryCount: 3,
      resourceMode: 'PHYSICAL_ONLY',
      onlineAccessUrl: '',
      onlineAccessType: '',
      locations: ['C-2-08'],
    },
    {
      bookId: 5,
      isbn: '9787508691230',
      title: '增长与复利',
      coverUrl: 'https://picsum.photos/seed/library-book-5/240/360',
      categoryId: 5,
      categoryName: '商业',
      categoryNames: ['商业'],
      authorNames: ['沈柏林'],
      publisherName: '中信出版社',
      description: '围绕长期主义、复利思维和组织增长建立的策略手册。',
      language: '中文',
      publishYear: 2025,
      availableCount: 4,
      availableCopies: 4,
      totalCopies: 6,
      inventoryCount: 6,
      resourceMode: 'HYBRID',
      onlineAccessUrl: 'https://example.com/book/5',
      onlineAccessType: 'LICENSED_ACCESS',
      locations: ['D-4-18', 'D-4-19'],
    },
    {
      bookId: 6,
      isbn: '9787301334011',
      title: '检索的温度',
      coverUrl: 'https://picsum.photos/seed/library-book-6/240/360',
      categoryId: 1,
      categoryName: '计算机',
      categoryNames: ['计算机'],
      authorNames: ['蒋思齐'],
      publisherName: '北京大学出版社',
      description: '面向图书馆信息检索场景，讨论推荐、搜索历史和语义联想。',
      language: '中文',
      publishYear: 2024,
      availableCount: 2,
      availableCopies: 2,
      totalCopies: 3,
      inventoryCount: 3,
      resourceMode: 'HYBRID',
      onlineAccessUrl: 'https://example.com/book/6',
      onlineAccessType: 'OPEN_ACCESS',
      locations: ['A-1-06'],
    },
  ],
  reviewsByBook: {
    1: [
      { reviewId: 1, username: '姜言', rating: 5, commentText: '适合做系统设计复习框架。', createTime: isoOffset(-7) },
      { reviewId: 2, username: '李珂', rating: 4, commentText: '案例密度高，适合边画图边读。', createTime: isoOffset(-4) },
    ],
    2: [
      { reviewId: 3, username: '周浅', rating: 5, commentText: '气质很安静，像一座真的海边馆。', createTime: isoOffset(-10) },
    ],
    5: [
      { reviewId: 4, username: '王朔', rating: 4, commentText: '内容不空，适合作为管理类入门延展。', createTime: isoOffset(-2) },
    ],
  },
  favoriteBookIds: [1, 3, 5],
  loans: [
    {
      loanId: 9001,
      bookId: 1,
      copyId: 301,
      bookTitle: '系统设计沉思录',
      bookCover: 'https://picsum.photos/seed/library-book-1/240/360',
      bookAuthorNames: '周明远',
      categoryName: '计算机',
      locationCode: 'A-3-12',
      borrowDate: formatDate(isoOffset(-10)),
      dueDate: formatDate(isoOffset(4)),
      status: 'BORROWED',
      renewalCount: 1,
      canRenew: true,
      daysRemaining: 4,
    },
    {
      loanId: 9002,
      bookId: 4,
      copyId: 302,
      bookTitle: '城市与档案',
      bookCover: 'https://picsum.photos/seed/library-book-4/240/360',
      bookAuthorNames: '何绍诚',
      categoryName: '历史',
      locationCode: 'C-2-08',
      borrowDate: formatDate(isoOffset(-18)),
      dueDate: formatDate(isoOffset(-2)),
      status: 'OVERDUE',
      renewalCount: 0,
      canRenew: false,
      daysOverdue: 2,
      daysRemaining: 0,
    },
  ],
  loanHistory: [
    {
      loanId: 8801,
      bookId: 2,
      copyId: 201,
      bookTitle: '海边图书馆',
      bookCover: 'https://picsum.photos/seed/library-book-2/240/360',
      bookAuthorNames: '陈知夏',
      categoryName: '文学',
      locationCode: 'B-1-03',
      borrowDate: formatDate(isoOffset(-55)),
      dueDate: formatDate(isoOffset(-32)),
      returnDate: formatDate(isoOffset(-34)),
      status: 'RETURNED',
      renewalCount: 0,
      canRenew: false,
    },
  ],
  reservations: [
    {
      reservationId: 7001,
      bookId: 2,
      bookTitle: '海边图书馆',
      bookIsbn: '9787020171647',
      coverUrl: 'https://picsum.photos/seed/library-book-2/240/360',
      status: 'PENDING',
      queuePosition: 2,
      reservationDate: formatDate(isoOffset(-3)),
      expiryDate: '',
    },
    {
      reservationId: 7002,
      bookId: 6,
      bookTitle: '检索的温度',
      bookIsbn: '9787301334011',
      coverUrl: 'https://picsum.photos/seed/library-book-6/240/360',
      status: 'AWAITING_PICKUP',
      queuePosition: 1,
      reservationDate: formatDate(isoOffset(-1)),
      expiryDate: formatDate(isoOffset(2)),
    },
  ],
  fines: [
    {
      fineId: 5001,
      loanId: 9002,
      bookTitle: '城市与档案',
      amount: 3.5,
      status: 'PENDING',
      type: 'OVERDUE',
      reason: '已逾期 2 天，请尽快归还。',
      createTime: formatDate(isoOffset(-1)),
    },
    {
      fineId: 5002,
      loanId: 8801,
      bookTitle: '海边图书馆',
      amount: 2,
      status: 'PAID',
      type: 'OVERDUE',
      reason: '上月逾期 1 天。',
      createTime: formatDate(isoOffset(-35)),
      paidTime: formatDate(isoOffset(-33)),
    },
  ],
  notifications: [
    {
      notificationId: 6001,
      title: '借阅即将到期',
      content: '《系统设计沉思录》将在 4 天后到期，请决定是否续借。',
      type: 'DUE_REMINDER',
      isRead: false,
      createTime: isoOffset(-1, -2),
      targetType: 'LOAN',
      targetId: '9001',
    },
    {
      notificationId: 6002,
      title: '预约到馆提醒',
      content: '《检索的温度》已为你留书，请在 2 天内前往取书。',
      type: 'ARRIVAL_NOTICE',
      isRead: false,
      createTime: isoOffset(-1),
      targetType: 'RESERVATION',
      targetId: '7002',
    },
    {
      notificationId: 6003,
      title: '老师发布了新荐书',
      content: '王老师推荐了《增长与复利》，适合做课程延伸阅读。',
      type: 'NEW_BOOK_RECOMMEND',
      isRead: true,
      createTime: isoOffset(-3),
      targetType: 'RECOMMENDATION',
      targetId: '8001',
    },
    {
      notificationId: 6004,
      title: '反馈已回复',
      content: '你提交的“自助借阅机建议”已有管理员回复。',
      type: 'SYSTEM',
      isRead: true,
      createTime: isoOffset(-2),
      targetType: 'FEEDBACK',
      targetId: '4001',
    },
  ],
  feedback: [
    {
      feedbackId: 4001,
      category: 'SUGGESTION',
      subject: '自助借阅机界面建议',
      content: '希望在借阅机上增加“最近搜索”和“续借提醒”入口。',
      status: 'RESOLVED',
      adminReply: '已纳入下期自助借阅机界面优化计划。',
      handledBy: '馆员-陈老师',
      createTime: isoOffset(-5),
      replyTime: isoOffset(-2),
    },
  ],
  appointments: [
    {
      appointmentId: 3001,
      serviceType: 'CONSULTATION',
      method: 'COUNTER',
      status: 'PENDING',
      scheduledTime: isoOffset(1, 3),
      notes: '想咨询毕业设计的数据库类书单。',
      bookTitle: '',
    },
    {
      appointmentId: 3002,
      serviceType: 'PICKUP_BOOK',
      method: 'SMART_LOCKER',
      status: 'COMPLETED',
      scheduledTime: isoOffset(-6),
      notes: '已完成自助取书。',
      bookTitle: '检索的温度',
    },
  ],
  recommendations: [
    {
      postId: 8001,
      authorUserId: 88,
      authorUsername: 'teacher.wang',
      authorFullName: '王老师',
      authorIdentityType: 'TEACHER',
      authorDepartment: '经济管理学院',
      bookId: 5,
      bookTitle: '增长与复利',
      bookIsbn: '9787508691230',
      bookCoverUrl: 'https://picsum.photos/seed/library-book-5/240/360',
      content: '适合作为“商业分析导论”课程课后延伸读物，结构完整且案例新。',
      createTime: isoOffset(-2),
      likeCount: 16,
      likedByMe: true,
      followingAuthor: true,
      canManage: false,
    },
    {
      postId: 8002,
      authorUserId: 89,
      authorUsername: 'teacher.song',
      authorFullName: '宋老师',
      authorIdentityType: 'TEACHER',
      authorDepartment: '设计学院',
      bookId: 3,
      bookTitle: '服务体验蓝图',
      bookIsbn: '9787111728880',
      bookCoverUrl: 'https://picsum.photos/seed/library-book-3/240/360',
      content: '做服务设计课程的同学可以从这本书建立方法框架，再结合馆内服务观察做练习。',
      createTime: isoOffset(-1),
      likeCount: 9,
      likedByMe: false,
      followingAuthor: false,
      canManage: false,
    },
  ],
  searchHistory: ['系统设计', '海边图书馆', '检索推荐'],
  hotKeywords: ['人工智能', '系统设计', '服务设计', '近代史', '数据分析'],
}

let state = deepClone(baseState)

function delay(data) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(deepClone(data)), 80)
  })
}

function getBook(bookId) {
  return state.books.find((item) => item.bookId === Number(bookId)) || null
}

function updateBookStock(bookId, diff) {
  const book = getBook(bookId)

  if (!book) {
    return
  }

  const nextCount = Math.max(0, (book.availableCount || 0) + diff)
  book.availableCount = nextCount
  book.availableCopies = nextCount
}

function getFavoriteBooks() {
  return state.favoriteBookIds
    .map((bookId) => getBook(bookId))
    .filter(Boolean)
}

function getActiveLoans() {
  return state.loans
}

function getLoanHistory() {
  return state.loanHistory
}

function getDueSoonLoans() {
  return state.loans
    .filter((item) => item.status === 'BORROWED' || item.status === 'OVERDUE')
    .slice(0, 3)
    .map((item) => ({
      loanId: item.loanId,
      bookId: item.bookId,
      bookTitle: item.bookTitle,
      dueDate: item.dueDate,
      daysRemaining: item.daysRemaining || 0,
      status: item.status,
    }))
}

function buildOverview() {
  const pendingReservations = state.reservations.filter((item) => item.status === 'PENDING' || item.status === 'AWAITING_PICKUP')
  const pendingFines = state.fines.filter((item) => item.status === 'PENDING')
  const unreadNotifications = state.notifications.filter((item) => !item.isRead)

  return {
    userId: 101,
    username: state.accounts[0].user.username,
    fullName: state.accounts[0].user.fullName,
    activeLoanCount: state.loans.length,
    dueSoonLoanCount: getDueSoonLoans().length,
    dueSoonLoans: getDueSoonLoans(),
    activeReservationCount: pendingReservations.length,
    readyReservationCount: pendingReservations.filter((item) => item.status === 'AWAITING_PICKUP').length,
    pendingFineCount: pendingFines.length,
    pendingFineTotal: pendingFines.reduce((sum, item) => sum + item.amount, 0),
    unreadNotificationCount: unreadNotifications.length,
    favoriteCount: state.favoriteBookIds.length,
    pendingServiceAppointmentCount: state.appointments.filter((item) => item.status === 'PENDING').length,
    completedServiceAppointmentCount: state.appointments.filter((item) => item.status === 'COMPLETED').length,
  }
}

function buildHomePage() {
  return {
    heroStats: [
      { label: '馆藏总量', value: 128430 },
      { label: '可借图书', value: 8742 },
      { label: '本周新书', value: 26 },
      { label: '数字资源', value: 4120 },
    ],
    featuredBooks: state.books.slice(0, 4).map((item) => ({
      id: item.bookId,
      title: item.title,
      author: item.authorNames.join(' / '),
      cover: item.coverUrl,
      tag: item.availableCount > 0 ? '馆藏推荐' : '排队热门',
    })),
    newArrivals: state.books.slice(2, 6).map((item, index) => ({
      id: item.bookId,
      title: item.title,
      author: item.authorNames.join(' / '),
      cover: item.coverUrl,
      tag: index % 2 === 0 ? '新上架' : '老师荐书',
    })),
    categories: state.categories.map((item) => ({
      categoryId: item.categoryId,
      label: item.name,
      count: state.books.filter((book) => book.categoryId === item.categoryId).length * 12,
    })),
  }
}

function buildBookDetail(bookId) {
  const book = getBook(bookId)

  if (!book) {
    return null
  }

  const activeLoan = state.loans.find((item) => item.bookId === Number(bookId))
  const activeReservation = state.reservations.find(
    (item) => item.bookId === Number(bookId) && (item.status === 'PENDING' || item.status === 'AWAITING_PICKUP'),
  )

  return {
    book,
    reviews: state.reviewsByBook[String(bookId)] || [],
    isFavorite: state.favoriteBookIds.includes(Number(bookId)),
    activeLoan,
    activeReservation,
    availableLocations: book.locations || [],
  }
}

function nextId(collection, field) {
  return collection.reduce((max, item) => Math.max(max, Number(item[field]) || 0), 0) + 1
}

const mockLibraryService = {
  reset() {
    state = deepClone(baseState)
  },

  bootstrapSession() {
    return delay(state.accounts[0].user)
  },

  login(payload) {
    const account = state.accounts.find(
      (item) => item.username === payload.username && item.password === payload.password,
    )

    if (!account) {
      return Promise.reject(new Error('账号或密码错误'))
    }

    return delay({
      token: 'mock-token-reader',
      user: account.user,
    })
  },

  register(payload) {
    const username = String(payload.username || '').trim()

    if (!username || !payload.password || !payload.fullName) {
      return Promise.reject(new Error('请完整填写注册信息'))
    }

    if (state.accounts.some((item) => item.username === username)) {
      return Promise.reject(new Error('用户名已存在'))
    }

    const userId = nextId(state.accounts.map((item) => item.user), 'userId')
    const account = {
      username,
      password: payload.password,
      user: {
        userId,
        username,
        fullName: payload.fullName,
        email: payload.email || `${username}@library.com`,
        role: 'USER',
        roles: ['USER'],
        identityType: payload.identityType || 'STUDENT',
        department: payload.department || '图书馆读者',
        major: payload.major || '未设置',
        enrollmentYear: Number(payload.enrollmentYear || 2026),
        interestTags: payload.interestTags || ['阅读', '图书馆服务'],
      },
    }

    state.accounts.push(account)

    return delay({
      token: `mock-token-${username}`,
      user: account.user,
    })
  },

  resetPassword(payload) {
    const username = String(payload.username || '').trim()
    const nextPassword = String(payload.password || '')
    const account = state.accounts.find((item) => item.username === username)

    if (!account) {
      return Promise.reject(new Error('账号不存在'))
    }

    if (!nextPassword || nextPassword.length < 6) {
      return Promise.reject(new Error('新密码至少 6 位'))
    }

    account.password = nextPassword
    return delay(true)
  },

  getHomePage() {
    return delay(buildHomePage())
  },

  getMyProfile() {
    return delay(state.accounts[0].user)
  },

  updateProfile(payload) {
    state.accounts[0].user = {
      ...state.accounts[0].user,
      ...payload,
    }

    return delay(state.accounts[0].user)
  },

  getMyOverview() {
    return delay(buildOverview())
  },

  getCatalog(params) {
    const query = params || {}
    const keyword = String(query.keyword || '').trim().toLowerCase()

    let items = [...state.books]

    if (query.categoryId) {
      items = items.filter((item) => item.categoryId === Number(query.categoryId))
    }

    if (keyword) {
      items = items.filter((item) =>
        [item.title, item.isbn, item.categoryName, item.authorNames.join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(keyword),
      )
    }

    if (query.availableOnly) {
      items = items.filter((item) => item.availableCount > 0)
    }

    const suggestions = keyword
      ? state.hotKeywords.filter((item) => item.toLowerCase().includes(keyword)).slice(0, 5)
      : []

    return delay({
      books: items,
      categories: state.categories,
      hotKeywords: state.hotKeywords,
      searchHistory: state.searchHistory,
      suggestions,
      favoriteBookIds: [...state.favoriteBookIds],
      loanBookIds: state.loans.map((item) => item.bookId),
      reservationBookIds: state.reservations
        .filter((item) => item.status === 'PENDING' || item.status === 'AWAITING_PICKUP')
        .map((item) => item.bookId),
    })
  },

  getBookDetail(bookId) {
    const detail = buildBookDetail(bookId)

    if (!detail) {
      return Promise.reject(new Error('图书不存在'))
    }

    return delay(detail)
  },

  toggleFavorite(bookId) {
    const numericBookId = Number(bookId)
    const exists = state.favoriteBookIds.includes(numericBookId)

    if (exists) {
      state.favoriteBookIds = state.favoriteBookIds.filter((item) => item !== numericBookId)
    } else {
      state.favoriteBookIds.unshift(numericBookId)
    }

    return delay({
      isFavorite: !exists,
    })
  },

  borrowBook(bookId) {
    const book = getBook(bookId)

    if (!book || book.availableCount <= 0) {
      return Promise.reject(new Error('当前没有可借副本，请改为预约'))
    }

    updateBookStock(bookId, -1)
    const loanId = nextId(state.loans.concat(state.loanHistory), 'loanId')
    const loan = {
      loanId,
      bookId: book.bookId,
      copyId: 400 + loanId,
      bookTitle: book.title,
      bookCover: book.coverUrl,
      bookAuthorNames: book.authorNames.join(' / '),
      categoryName: book.categoryName,
      locationCode: (book.locations || [])[0] || '',
      borrowDate: formatDate(isoOffset(0)),
      dueDate: formatDate(isoOffset(14)),
      status: 'BORROWED',
      renewalCount: 0,
      canRenew: true,
      daysRemaining: 14,
    }

    state.loans.unshift(loan)
    return delay(loan)
  },

  reserveBook(bookId) {
    const book = getBook(bookId)

    if (!book) {
      return Promise.reject(new Error('图书不存在'))
    }

    const reservation = {
      reservationId: nextId(state.reservations, 'reservationId'),
      bookId: book.bookId,
      bookTitle: book.title,
      bookIsbn: book.isbn,
      coverUrl: book.coverUrl,
      status: 'PENDING',
      queuePosition: state.reservations.length + 1,
      reservationDate: formatDate(isoOffset(0)),
      expiryDate: '',
    }

    state.reservations.unshift(reservation)
    return delay(reservation)
  },

  submitReview(bookId, payload) {
    const review = {
      reviewId: nextId([].concat(...Object.values(state.reviewsByBook)), 'reviewId'),
      username: state.accounts[0].user.fullName,
      rating: Number(payload.rating) || 5,
      commentText: payload.commentText || '',
      createTime: isoOffset(0),
    }

    const key = String(bookId)
    state.reviewsByBook[key] = [review].concat(state.reviewsByBook[key] || [])

    return delay(review)
  },

  getShelf() {
    return delay({
      favorites: getFavoriteBooks(),
      activeLoans: getActiveLoans(),
      historyLoans: getLoanHistory(),
    })
  },

  getLoanById(loanId) {
    const loan = state.loans.concat(state.loanHistory).find((item) => item.loanId === Number(loanId))

    if (!loan) {
      return Promise.reject(new Error('借阅记录不存在'))
    }

    return delay(loan)
  },

  renewLoan(loanId) {
    const loan = state.loans.find((item) => item.loanId === Number(loanId))

    if (!loan || !loan.canRenew) {
      return Promise.reject(new Error('当前借阅不可续借'))
    }

    loan.renewalCount += 1
    loan.canRenew = loan.renewalCount < 2
    loan.dueDate = formatDate(isoOffset(11))
    loan.daysRemaining = 11

    return delay(loan)
  },

  returnLoan(loanId) {
    const index = state.loans.findIndex((item) => item.loanId === Number(loanId))

    if (index < 0) {
      return Promise.reject(new Error('借阅记录不存在'))
    }

    const loan = state.loans[index]
    state.loans.splice(index, 1)
    updateBookStock(loan.bookId, 1)
    state.loanHistory.unshift({
      ...loan,
      status: 'RETURNED',
      canRenew: false,
      returnDate: formatDate(isoOffset(0)),
    })

    return delay(true)
  },

  getReservations() {
    return delay(state.reservations)
  },

  cancelReservation(reservationId) {
    const item = state.reservations.find((reservation) => reservation.reservationId === Number(reservationId))

    if (!item) {
      return Promise.reject(new Error('预约记录不存在'))
    }

    item.status = 'CANCELLED'
    return delay(item)
  },

  getFines() {
    return delay(state.fines)
  },

  payFine(fineId) {
    const item = state.fines.find((fine) => fine.fineId === Number(fineId))

    if (!item) {
      return Promise.reject(new Error('罚款记录不存在'))
    }

    item.status = 'PAID'
    item.paidTime = formatDate(isoOffset(0))
    return delay(item)
  },

  getNotifications() {
    return delay(state.notifications)
  },

  markNotificationRead(notificationId) {
    const item = state.notifications.find((notification) => notification.notificationId === Number(notificationId))

    if (item) {
      item.isRead = true
    }

    return delay(item)
  },

  markAllNotificationsRead() {
    state.notifications.forEach((item) => {
      item.isRead = true
    })

    return delay(true)
  },

  deleteNotification(notificationId) {
    state.notifications = state.notifications.filter((item) => item.notificationId !== Number(notificationId))
    return delay(true)
  },

  clearReadNotifications() {
    state.notifications = state.notifications.filter((item) => !item.isRead)
    return delay(true)
  },

  getFeedback() {
    return delay(state.feedback)
  },

  submitFeedback(payload) {
    const item = {
      feedbackId: nextId(state.feedback, 'feedbackId'),
      category: payload.category,
      subject: payload.subject,
      content: payload.content,
      status: 'SUBMITTED',
      adminReply: '',
      handledBy: '',
      createTime: isoOffset(0),
    }

    state.feedback.unshift(item)
    return delay(item)
  },

  getAppointments() {
    return delay(state.appointments)
  },

  createAppointment(payload) {
    const appointment = {
      appointmentId: nextId(state.appointments, 'appointmentId'),
      serviceType: payload.serviceType,
      method: payload.method,
      status: 'PENDING',
      scheduledTime: payload.scheduledTime,
      notes: payload.notes || '',
      bookTitle: payload.bookTitle || '',
    }

    state.appointments.unshift(appointment)
    return delay(appointment)
  },

  cancelAppointment(appointmentId) {
    const appointment = state.appointments.find((item) => item.appointmentId === Number(appointmentId))

    if (!appointment) {
      return Promise.reject(new Error('预约记录不存在'))
    }

    appointment.status = 'CANCELLED'
    return delay(appointment)
  },

  getRecommendations(scope) {
    let items = [...state.recommendations]

    if (scope === 'following') {
      items = items.filter((item) => item.followingAuthor)
    } else if (scope === 'mine') {
      items = items.filter((item) => item.canManage)
    }

    return delay(items)
  },

  searchBooks(keyword) {
    const normalized = String(keyword || '').trim().toLowerCase()

    if (!normalized) {
      return delay([])
    }

    return delay(
      state.books.filter((item) =>
        [item.title, item.isbn, item.authorNames.join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(normalized),
      ).slice(0, 6),
    )
  },

  createRecommendation(payload) {
    const book = getBook(payload.bookId)

    if (!book) {
      return Promise.reject(new Error('图书不存在'))
    }

    const post = {
      postId: nextId(state.recommendations, 'postId'),
      authorUserId: 101,
      authorUsername: state.accounts[0].user.username,
      authorFullName: state.accounts[0].user.fullName,
      authorIdentityType: state.accounts[0].user.identityType,
      authorDepartment: state.accounts[0].user.department,
      bookId: book.bookId,
      bookTitle: book.title,
      bookIsbn: book.isbn,
      bookCoverUrl: book.coverUrl,
      content: payload.content,
      createTime: isoOffset(0),
      likeCount: 0,
      likedByMe: false,
      followingAuthor: false,
      canManage: true,
    }

    state.recommendations.unshift(post)
    return delay(post)
  },

  toggleRecommendationLike(postId) {
    const post = state.recommendations.find((item) => item.postId === Number(postId))

    if (!post) {
      return Promise.reject(new Error('推荐动态不存在'))
    }

    post.likedByMe = !post.likedByMe
    post.likeCount += post.likedByMe ? 1 : -1
    return delay(post)
  },

  toggleRecommendationFollow(postId) {
    const post = state.recommendations.find((item) => item.postId === Number(postId))

    if (!post) {
      return Promise.reject(new Error('推荐动态不存在'))
    }

    post.followingAuthor = !post.followingAuthor
    return delay(post)
  },

  deleteRecommendation(postId) {
    state.recommendations = state.recommendations.filter((item) => item.postId !== Number(postId))
    return delay(true)
  },
}

// Keep the legacy module path working while routing callers to the real API layer.
module.exports = {
  mockLibraryService: require('./library').libraryService,
}
