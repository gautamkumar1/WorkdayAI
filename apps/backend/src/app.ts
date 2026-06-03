import express, { type Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { errorHandler } from './middleware/errorHandler'
import authRouter from './routes/auth'
import resumesRouter from './routes/resumes'
import aiRouter from './routes/ai'

const app: Express = express()

const allowedOrigins = [
  'http://localhost:3000',
  process.env['EXTENSION_ORIGIN'],
].filter(Boolean) as string[]

app.use(helmet())
app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/resumes', resumesRouter)
app.use('/api/ai', aiRouter)

app.use(errorHandler)

export default app
