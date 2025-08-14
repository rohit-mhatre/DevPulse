// Shared types between main and renderer processes

export interface AppConfig {
  version: string;
  name: string;
}

export interface DatabaseConfig {
  path: string;
  version: number;
}