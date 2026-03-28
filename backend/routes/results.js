import { Router } from 'express'
import { getResult, getBooks, getLibraryLocation } from '../controllers/resultController.js'

const router = Router()

router.get('/result/:userId', getResult)          // GET /api/result/:userId
router.get('/books/:slug', getBooks)              // GET /api/books/:slug
router.get('/library/:slug', getLibraryLocation)  // GET /api/library/:slug

export default router
