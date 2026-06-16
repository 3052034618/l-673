import { Router } from 'express';
import * as approvalController from '../controllers/approval.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', approvalController.getAllApprovals);
router.get('/count/pending', approvalController.getPendingCount);
router.get('/history', approvalController.getApprovalHistory);
router.get('/plant/:plantId', approvalController.getApprovalsByPlant);
router.get('/:id', approvalController.getApprovalById);
router.post('/', approvalController.createApproval);
router.post('/:id/approve', approvalController.approveStep);
router.post('/:id/reject', approvalController.rejectApproval);

export default router;
