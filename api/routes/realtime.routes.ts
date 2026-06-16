import { Router } from 'express';
import * as realtimeController from '../controllers/realtime.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', realtimeController.getCurrentRealtimeData);
router.get('/aggregated', realtimeController.getAggregatedData);
router.get('/plant/:plantId/summary', realtimeController.getPlantSummary);
router.get('/plant/:plantId/history', realtimeController.getRealtimeHistory);
router.post('/', realtimeController.addRealtimeData);

export default router;
