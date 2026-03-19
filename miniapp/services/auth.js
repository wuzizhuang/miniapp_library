const { request } = require('../utils/request')
const {
  setStoredToken,
  setStoredRefreshToken,
  setStoredUser,
  clearSessionStorage,
} = require('../utils/storage')

function normalizeRoles(primaryRole, roles) {
  const roleSet = new Set()

  if (primaryRole) {
    roleSet.add(String(primaryRole).toUpperCase())
  }

  ;(roles || []).forEach((role) => {
    if (role) {
      roleSet.add(String(role).toUpperCase())
    }
  })

  if (roleSet.size === 0) {
    roleSet.add('USER')
  }

  return Array.from(roleSet)
}

function mapProfileToUser(profile, session) {
  return {
    userId: profile.userId,
    username: profile.username,
    email: profile.email,
    fullName: profile.fullName || profile.username,
    role: profile.role,
    roles: normalizeRoles(profile.role, session && session.roles),
    permissions: (session && session.permissions) || [],
  }
}

const authService = {
  login(payload) {
    return request({
      url: '/auth/login',
      method: 'POST',
      data: payload,
    })
  },

  register(payload) {
    return request({
      url: '/auth/register',
      method: 'POST',
      data: payload,
    })
  },

  forgotPassword(payload) {
    return request({
      url: '/auth/forgot-password',
      method: 'POST',
      data: payload,
    })
  },

  validateResetToken(token) {
    return request({
      url: '/auth/reset-password/validate',
      query: { token },
    })
  },

  resetPassword(payload) {
    return request({
      url: '/auth/reset-password',
      method: 'POST',
      data: payload,
    })
  },

  refreshSession(refreshToken) {
    return request({
      url: '/auth/refresh',
      method: 'POST',
      data: { refreshToken },
      skipAuthRefresh: true,
    })
  },

  getContext(tokenOverride) {
    return request({
      url: '/auth/context',
      auth: true,
      tokenOverride,
    })
  },

  getMyProfile(tokenOverride) {
    return request({
      url: '/users/me/profile',
      auth: true,
      tokenOverride,
    })
  },

  updateProfile(payload) {
    return request({
      url: '/users/me/profile',
      method: 'PUT',
      data: payload,
      auth: true,
    })
  },

  logout(refreshToken) {
    return request({
      url: '/auth/logout',
      method: 'POST',
      data: refreshToken ? { refreshToken } : undefined,
      auth: true,
      skipAuthRefresh: true,
    }).catch(() => undefined)
  },

  async loginAndBootstrap(payload) {
    const session = await this.login(payload)
    const profile = await this.getMyProfile(session.token)
    const user = mapProfileToUser(profile, session)

    setStoredToken(session.token)
    setStoredRefreshToken(session.refreshToken)
    setStoredUser(user)

    return {
      session,
      user,
    }
  },

  async bootstrapFromToken(token) {
    const [context, profile] = await Promise.all([
      this.getContext(token),
      this.getMyProfile(token),
    ])

    const user = mapProfileToUser(profile, context)

    setStoredToken(token)
    setStoredUser(user)

    return user
  },

  clearSession() {
    clearSessionStorage()
  },
}

module.exports = {
  authService,
}
