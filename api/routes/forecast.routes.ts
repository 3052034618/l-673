import { Router } from 'express';
import * as forecastController from '../controllers/forecast.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/upload', forecastController.uploadSupplyPlan);
router.get('/gap', forecastController.getGapForecast);
router.get('/transport', forecastController.getOptimalTransportPlan);
router.get('/standby', forecastController.getStandbyBoilerRecommendation);
router.get('/history', forecastController.getForecastHistory);

export default router;
