import express from 'express'
import { getTest2Questions } from '../controllers/test2Controller.js'

const router = express.Router()

router.get('/', getTest2Questions)

export default router
