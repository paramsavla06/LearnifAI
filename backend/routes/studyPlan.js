import express from 'express'
import { getStudyPlan, updateStudyPlan } from '../controllers/studyPlanController.js'

const router = express.Router()

router.get('/',       getStudyPlan)
router.post('/update', updateStudyPlan)

export default router
