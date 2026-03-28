import { Router } from 'express'
import { getQuestions } from '../controllers/questionController.js'

const router = Router()

router.get('/:slug', getQuestions)  // GET /api/questions/:slug?limit=3

export default router
