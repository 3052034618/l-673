import bcrypt from 'bcryptjs';
import { db, generateId } from '../db/memoryStore.js';
import { generateToken } from '../middleware/auth.middleware.js';
import type { User } from '../../shared/types.js';

export const login = async (username: string, password: string) => {
  const user = db.users.find(u => u.username === username);
  
  if (!user) {
    throw new Error('用户名或密码错误');
  }
  
  const userWithPassword = user as any;
  const isValid = await bcrypt.compare(password, userWithPassword.password_hash);
  
  if (!isValid) {
    throw new Error('用户名或密码错误');
  }
  
  const token = generateToken(user.id);
  
  const { password_hash, ...userWithoutPassword } = user as any;
  
  return {
    token,
    user: userWithoutPassword as User
  };
};

export const getCurrentUser = (userId: string) => {
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    throw new Error('用户不存在');
  }
  const { password_hash, ...userWithoutPassword } = user as any;
  return userWithoutPassword as User;
};
