import { Router } from 'express';
import * as alertController from '../controllers/alert.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', alertController.getAllAlerts);
router.get('/count/active', alertController.getActiveAlertsCount);
router.get('/:id', alertController.getAlertById);
router.post('/:id/acknowledge', alertController.acknowledgeAlert);
router.post('/:id/resolve', alertController.resolveAlert);
router.post('/:id/escalate', alertController.escalateAlert);

export default router;
