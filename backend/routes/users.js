import { Router } from 'express'
import { createUser, getUser } from '../controllers/userController.js'

const router = Router()

router.post('/', createUser)           // POST /api/user  — create/update profile
router.get('/:userId', getUser)        // GET  /api/user/:userId

export default router
