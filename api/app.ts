/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import plantRoutes from './routes/plant.routes.js'
import realtimeRoutes from './routes/realtime.routes.js'
import alertRoutes from './routes/alert.routes.js'
import approvalRoutes from './routes/approval.routes.js'
import forecastRoutes from './routes/forecast.routes.js'
import reportRoutes from './routes/report.routes.js'

import { initializeMockData } from './db/mockData.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

initializeMockData()

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/plants', plantRoutes)
app.use('/api/realtime', realtimeRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/approvals', approvalRoutes)
app.use('/api/forecast', forecastRoutes)
app.use('/api/reports', reportRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
