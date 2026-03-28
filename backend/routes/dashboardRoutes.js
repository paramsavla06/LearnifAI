import express from 'express'
import { getDashboardData, getCourseDetail } from '../controllers/dashboardController.js'

const router = express.Router()

// GET /api/dashboard/:userId  — full dashboard data (real DB)
router.get('/:userId', getDashboardData)

// GET /api/dashboard/:userId/course/:subjectName — course detail with concepts + user mastery
router.get('/:userId/course/:subjectName', getCourseDetail)

export default router
