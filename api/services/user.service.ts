import bcrypt from 'bcryptjs';
import { db, generateId } from '../db/memoryStore.js';
import type { User, UserRole } from '../../shared/types.js';

export const getAllUsers = (): User[] => {
  return db.users.map(u => {
    const { password_hash, ...user } = u as any;
    return user as User;
  });
};

export const getUserById = (id: string): User | undefined => {
  const user = db.users.find(u => u.id === id);
  if (!user) return undefined;
  const { password_hash, ...userWithoutPassword } = user as any;
  return userWithoutPassword as User;
};

export const createUser = async (userData: Omit<User, 'id'> & { password: string }): Promise<User> => {
  const existingUser = db.users.find(u => u.username === userData.username);
  if (existingUser) {
    throw new Error('用户名已存在');
  }
  
  const passwordHash = await bcrypt.hash(userData.password, 10);
  
  const newUser: any = {
    id: generateId(),
    username: userData.username,
    name: userData.name,
    role: userData.role,
    region: userData.region,
    plantId: userData.plantId,
    permissions: userData.permissions,
    password_hash: passwordHash
  };
  
  db.users.push(newUser);
  
  const { password_hash, ...userWithoutPassword } = newUser;
  return userWithoutPassword as User;
};

export const updateUser = (id: string, userData: Partial<User> & { password?: string }): User => {
  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) {
    throw new Error('用户不存在');
  }
  
  const existingUser = db.users[index] as any;
  
  if (userData.username && userData.username !== existingUser.username) {
    const duplicateUser = db.users.find(u => u.username === userData.username);
    if (duplicateUser) {
      throw new Error('用户名已存在');
    }
  }
  
  const updatedUser: any = {
    ...existingUser,
    ...userData
  };
  
  if (userData.password) {
    updatedUser.password_hash = bcrypt.hashSync(userData.password, 10);
  }
  
  db.users[index] = updatedUser;
  
  const { password_hash, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword as User;
};

export const deleteUser = (id: string): void => {
  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) {
    throw new Error('用户不存在');
  }
  
  db.users.splice(index, 1);
};

export const getUsersByRole = (role: UserRole): User[] => {
  return db.users
    .filter(u => u.role === role)
    .map(u => {
      const { password_hash, ...user } = u as any;
      return user as User;
    });
};
