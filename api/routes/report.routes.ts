import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', reportController.getWeeklyReports);
router.get('/latest', reportController.getLatestReport);
router.get('/statistics', reportController.getStatistics);
router.get('/:id', reportController.getReportById);
router.post('/generate', requireRole(['group_admin', 'region_admin']), reportController.generateWeeklyReport);

export default router;
