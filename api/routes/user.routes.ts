import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', requireRole(['group_admin']), userController.getAllUsers);
router.get('/role/:role', requireRole(['group_admin']), userController.getUsersByRole);
router.get('/:id', requireRole(['group_admin']), userController.getUserById);
router.post('/', requireRole(['group_admin']), userController.createUser);
router.put('/:id', requireRole(['group_admin']), userController.updateUser);
router.delete('/:id', requireRole(['group_admin']), userController.deleteUser);

export default router;
