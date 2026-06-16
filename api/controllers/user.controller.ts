import { Request, Response } from 'express';
import * as userService from '../services/user.service.js';
import { filterPlantsByUser } from '../middleware/rbac.middleware.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { z } from 'zod';

const createUserSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符'),
  password: z.string().min(6, '密码至少6个字符'),
  name: z.string().min(1, '姓名不能为空'),
  role: z.enum(['group_admin', 'region_admin', 'shift_supervisor', 'plant_manager', 'epb']),
  region: z.string().optional(),
  plantId: z.string().optional(),
  permissions: z.array(z.string()).default([])
});

const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['group_admin', 'region_admin', 'shift_supervisor', 'plant_manager', 'epb']).optional(),
  region: z.string().optional(),
  plantId: z.string().optional(),
  permissions: z.array(z.string()).optional()
});

export const getAllUsers = (req: AuthRequest, res: Response) => {
  try {
    const users = userService.getAllUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserById = (req: AuthRequest, res: Response) => {
  try {
    const user = userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const validated = createUserSchema.parse(req.body);
    const user = await userService.createUser(validated as any);
    res.status(201).json(user);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const updateUser = (req: AuthRequest, res: Response) => {
  try {
    const validated = updateUserSchema.parse(req.body);
    const user = userService.updateUser(req.params.id, validated);
    res.json(user);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const deleteUser = (req: AuthRequest, res: Response) => {
  try {
    userService.deleteUser(req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getUsersByRole = (req: AuthRequest, res: Response) => {
  try {
    const role = req.params.role as any;
    const users = userService.getUsersByRole(role);
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
