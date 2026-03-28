import { Router } from 'express'
import { getSubjects } from '../controllers/subjectController.js'

const router = Router()

router.get('/', getSubjects)      // GET /api/subjects?branch=CSE-DS&year=SE

export default router
