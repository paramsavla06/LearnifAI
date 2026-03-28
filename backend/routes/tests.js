import { Router } from 'express'
import { submitTest } from '../controllers/testController.js'

const router = Router()

router.post('/submit-test', submitTest)   // POST /api/submit-test

export default router
