import { Router, Request, Response } from 'express'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const router = Router()

const APS_AUTH_URL = 'https://developer.api.autodesk.com/authentication/v2/authorize'
const APS_TOKEN_URL = 'https://developer.api.autodesk.com/authentication/v2/token'
const APS_PROFILE_URL = 'https://developer.api.autodesk.com/userprofile/v1/users/@me'

const CLIENT_ID = process.env.APS_CLIENT_ID!
const CLIENT_SECRET = process.env.APS_CLIENT_SECRET!
const CALLBACK_URL = process.env.APS_CALLBACK_URL!
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

const SCOPES = 'data:read account:read openid'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 3600 * 1000, // 1 hour
}
const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 7 * 24 * 3600 * 1000, // 7 days
}

// GET /api/auth/login — redirect user to Autodesk OAuth
router.get('/login', (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    scope: SCOPES,
  })
  res.redirect(`${APS_AUTH_URL}?${params.toString()}`)
})

// GET /api/auth/callback — exchange code for tokens
router.get('/callback', async (req: Request, res: Response) => {
  const { code } = req.query

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Missing authorization code' })
    return
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: CALLBACK_URL,
    })

    const { data } = await axios.post(APS_TOKEN_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
    })

    res.cookie('access_token', data.access_token, COOKIE_OPTIONS)
    res.cookie('refresh_token', data.refresh_token, REFRESH_COOKIE_OPTIONS)
    res.redirect(CLIENT_ORIGIN)
  } catch (err) {
    console.error('Token exchange error:', err)
    res.redirect(`${CLIENT_ORIGIN}/login?error=auth_failed`)
  }
})

// POST /api/auth/refresh — use refresh token to get new access token
router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token

  if (!refreshToken) {
    res.status(401).json({ error: 'No refresh token' })
    return
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

    const { data } = await axios.post(APS_TOKEN_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
    })

    res.cookie('access_token', data.access_token, COOKIE_OPTIONS)
    if (data.refresh_token) {
      res.cookie('refresh_token', data.refresh_token, REFRESH_COOKIE_OPTIONS)
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('Refresh error:', err)
    res.clearCookie('access_token')
    res.clearCookie('refresh_token')
    res.status(401).json({ error: 'Refresh failed' })
  }
})

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('access_token')
  res.clearCookie('refresh_token')
  res.json({ ok: true })
})

// GET /api/auth/status — check if user is authenticated + return profile
router.get('/status', async (req: Request, res: Response) => {
  const accessToken = req.cookies?.access_token

  if (!accessToken) {
    res.json({ authenticated: false, user: null })
    return
  }

  try {
    const { data } = await axios.get(APS_PROFILE_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    res.json({ authenticated: true, user: data })
  } catch {
    res.json({ authenticated: false, user: null })
  }
})

export default router
