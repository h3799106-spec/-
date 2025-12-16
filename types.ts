export enum ThemeId {
  VARIATION_A = 'VARIATION_A',
  VARIATION_B = 'VARIATION_B',
}

export interface PhotoTheme {
  id: ThemeId;
  title: string;
  description: string;
  icon: string;
}

export interface GeneratedPhoto {
  themeId: ThemeId;
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface ImageUploadState {
  originalImage: string | null; // Base64 string
  file: File | null;
}