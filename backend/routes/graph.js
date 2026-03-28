import express from 'express'
import { buildGraph } from '../controllers/graphController.js'

const router = express.Router()

// GET /api/graph?userId=xxx[&rebuild=true]
router.get('/', buildGraph)

export default router
