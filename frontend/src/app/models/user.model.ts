export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum ChatbotMode {
  DISABLED = 'disabled',
  BETA = 'beta',
  ENABLED = 'enabled',
}

export interface User {
  id: string;
  username: string;
  nombre: string;
  role: UserRole;
  chatbotMode?: ChatbotMode;
  createdAt?: Date;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    token: string;
    user: User;
  };
  error?: string;
  details?: any;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  nombre: string;
}

export interface CreateUserRequest extends RegisterRequest {
  role?: UserRole;
}

export interface UsersResponse {
  success: boolean;
  data?: User[];
  error?: string;
}
