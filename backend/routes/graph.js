import express from 'express'
import { 
    buildGraph,
    getStudyPlan,
    updatePlanStatus,
    getCooccurrence
} from '../controllers/graphController.js'

const router = express.Router()

// GET /api/graph?userId=xxx[&rebuild=true]
router.get('/',              buildGraph);
router.get('/study-plan',    getStudyPlan);      // NEW
router.patch('/study-plan',  updatePlanStatus);  // NEW
router.get('/cooccurrence',  getCooccurrence);   // NEW

export default router
