import express from 'express'
import { register, login } from '../controllers/authController.js'
import { getDashboardData } from '../controllers/dashboardController.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.get('/dashboard/:userId', getDashboardData)

export default router
