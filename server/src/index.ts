import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'
import { existsSync } from 'fs'
import authRouter from './routes/auth'
import accRouter from './routes/acc'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const isProduction = process.env.NODE_ENV === 'production'
const clientDistPath = path.resolve(__dirname, '../../client/dist')

if (isProduction) {
  app.set('trust proxy', 1)
}

if (!isProduction) {
  app.use(cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }))
}

app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/acc', accRouter)

if (isProduction && existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath))

  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next()
      return
    }

    res.sendFile(path.join(clientDistPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
