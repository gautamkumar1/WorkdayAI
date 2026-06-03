import express, { type Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { errorHandler } from './middleware/errorHandler'
import authRouter from './routes/auth'
import resumesRouter from './routes/resumes'
import aiRouter from './routes/ai'
import applicationsRouter from './routes/applications'

const app: Express = express()

const allowedOrigins = ['http://localhost:3000', process.env['EXTENSION_ORIGIN']].filter(
  Boolean,
) as string[]

app.use(helmet())
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman) and all chrome-extension:// origins
      if (!origin || origin.startsWith('chrome-extension://') || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`CORS: ${origin} not allowed`))
      }
    },
    credentials: true,
  }),
)
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/resumes', resumesRouter)
app.use('/api/ai', aiRouter)
app.use('/api/applications', applicationsRouter)

app.use(errorHandler)

export default app
