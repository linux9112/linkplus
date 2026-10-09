/**
 * LinkPulse Frontend Core Types & Interfaces
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | string;
  status: 'active' | 'suspended' | string;
  email_verified: boolean;
  created_at: string | Date;
}

export interface Profile {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  theme_settings: {
    preset?: string;
    background_type?: 'color' | 'gradient' | 'image';
    background_value?: string;
    button_shape?: 'rounded' | 'rounded-lg' | 'rounded-full' | 'sharp';
    font_family?: string;
    [key: string]: unknown;
  };
  social_links: Array<{
    platform: string;
    url: string;
  }>;
  is_public: boolean;
}

export interface QrSetting {
  id: string;
  foreground_color: string;
  background_color: string;
  gradient_settings?: Record<string, unknown> | null;
  dot_style: string;
  corner_style: string;
  logo_url?: string | null;
  error_correction_level: string;
  margin: number;
  resolution: number;
  transparent_background: boolean;
  preset_name?: string | null;
}

export interface Link {
  id: string;
  user_id?: string;
  title: string;
  destination_url: string;
  description?: string | null;
  icon?: string | null;
  thumbnail_url?: string | null;
  position: number;
  is_active: boolean;
  is_pinned: boolean;
  is_hidden: boolean;
  is_featured: boolean;
  category?: string | null;
  custom_label?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  utm_params?: Record<string, string> | null;
  click_count: number;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthContextType extends AuthState {
  login: (identifier: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface ApiSuccessResponse<T = unknown> {
  user?: User;
  profile?: Profile;
  message?: string;
  data?: T;
}

export class ApiError extends Error {
  constructor(
    public override message: string,
    public status: number,
    public field?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
