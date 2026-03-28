import express from 'express'
import { getPrograms, getSubjectsForUser } from '../controllers/programController.js'

const router = express.Router()

router.get('/',         getPrograms)
router.get('/subjects', getSubjectsForUser)

export default router
