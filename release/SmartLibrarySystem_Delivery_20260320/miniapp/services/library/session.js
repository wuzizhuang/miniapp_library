const {
  buildSessionUserFromToken,
  getCurrentApp,
  mapProfileToSessionUser,
} = require('./shared')

function createSessionLibraryService(deps) {
  const {
    authService,
    publicService,
    userService,
    getStoredRefreshToken,
    getStoredToken,
  } = deps

  async function login(payload) {
    const session = await authService.login(payload)
    const user = await buildSessionUserFromToken(authService, session.token)

    return {
      token: session.token,
      refreshToken: session.refreshToken,
      user,
    }
  }

  return {
    login,

    async bootstrapFromToken(token) {
      const user = await buildSessionUserFromToken(authService, token)

      return {
        token: getStoredToken() || token,
        refreshToken: getStoredRefreshToken() || undefined,
        user,
      }
    },

    async register(payload) {
      await authService.register({
        username: payload.username,
        password: payload.password,
        fullName: payload.fullName,
        email: payload.email,
      })

      return login({
        username: payload.username,
        password: payload.password,
      })
    },

    requestPasswordReset(payload) {
      return authService.forgotPassword({
        email: payload.email,
      })
    },

    getHomePage() {
      return publicService.getHomePage()
    },

    getMyProfile() {
      return authService.getMyProfile()
    },

    async updateProfile(payload) {
      const profile = await authService.updateProfile({
        fullName: payload.fullName,
        department: payload.department,
        major: payload.major,
        enrollmentYear: Number.isFinite(payload.enrollmentYear) && payload.enrollmentYear > 0
          ? payload.enrollmentYear
          : undefined,
        interestTags: Array.isArray(payload.interestTags) ? payload.interestTags : [],
      })
      const app = getCurrentApp()
      const currentUser = app && typeof app.getCurrentUser === 'function' ? app.getCurrentUser() : null

      return mapProfileToSessionUser(profile, currentUser)
    },

    getMyOverview() {
      return userService.getMyOverview()
    },
  }
}

module.exports = {
  createSessionLibraryService,
}
