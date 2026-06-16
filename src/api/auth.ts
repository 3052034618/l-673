import request from './request';
import type { User } from '../../shared/types';

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const login = (params: LoginParams): Promise<LoginResponse> => {
  return request.post('/auth/login', params);
};

export const getCurrentUser = (): Promise<User> => {
  return request.get('/auth/me');
};

export const logout = (): Promise<void> => {
  return request.post('/auth/logout');
};
