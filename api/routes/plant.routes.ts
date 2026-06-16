import { Router } from 'express';
import * as plantController from '../controllers/plant.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', plantController.getAllPlants);
router.get('/province-stats', plantController.getProvinceStats);
router.get('/ranking', plantController.getPlantRanking);
router.get('/province/:province', plantController.getPlantsByProvince);
router.get('/:id', plantController.getPlantById);

router.post('/', requireRole(['group_admin']), plantController.createPlant);
router.put('/:id', requireRole(['group_admin', 'region_admin']), plantController.updatePlant);
router.delete('/:id', requireRole(['group_admin']), plantController.deletePlant);

router.post('/:plantId/units', requireRole(['group_admin', 'region_admin']), plantController.addUnit);
router.put('/units/:unitId', requireRole(['group_admin', 'region_admin']), plantController.updateUnit);

export default router;
