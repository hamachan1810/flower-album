export interface Flower {
  id: number;
  name: string;
  name_scientific?: string;
  language: string[];
  origin?: string;
  source_culture?: string;
  source_culture_notes?: string;
  birth_month?: number;
  birth_day?: number;
  season?: string;
  primary_emotions: string[];
  compound_emotion?: string;
  emotion_intensity?: string;
  sentiment?: string;
  scene_tags: string[];
  habitat_description?: string;
  created_at: string;
  photos?: Photo[];
}

export interface Photo {
  id: number;
  flower_id: number;
  file_path?: string;
  is_wikimedia: number;
  wikimedia_url?: string;
  shot_date?: string;
  shot_location?: string;
  user_memo?: string;
  user_emotion_tags: string[];
  uploaded_at: string;
}

export interface WishlistItem {
  id: number;
  flower_id: number;
  added_at: string;
  is_captured: number;
  flower?: Flower;
}

export interface FlowerRaw {
  id: number;
  name: string;
  name_scientific?: string;
  language: string;
  origin?: string;
  source_culture?: string;
  source_culture_notes?: string;
  birth_month?: number;
  birth_day?: number;
  season?: string;
  primary_emotions: string;
  compound_emotion?: string;
  emotion_intensity?: string;
  sentiment?: string;
  scene_tags: string;
  habitat_description?: string;
  created_at: string;
}

export interface PhotoRaw {
  id: number;
  flower_id: number;
  file_path?: string;
  is_wikimedia: number;
  wikimedia_url?: string;
  shot_date?: string;
  shot_location?: string;
  user_memo?: string;
  user_emotion_tags: string;
  uploaded_at: string;
}

export interface AnalyzeResult {
  name: string;
  name_scientific?: string;
  language: string[];
  origin?: string;
  source_culture?: string;
  source_culture_notes?: string;
  birth_month?: number;
  birth_day?: number;
  season?: string;
  primary_emotions: string[];
  compound_emotion?: string;
  emotion_intensity?: string;
  sentiment?: string;
  scene_tags: string[];
  habitat_description?: string;
}

export interface WikimediaResult {
  url: string;
  license?: string;
  attribution?: string;
}

export interface INaturalistObservation {
  id: number;
  lat: number;
  lng: number;
  observed_on?: string;
  photos: Array<{ url: string }>;
}

export const EMOTION_COLORS: Record<string, string> = {
  joy: '#FFE234',
  trust: '#8BC34A',
  fear: '#009688',
  surprise: '#29B6F6',
  sadness: '#5C6BC0',
  disgust: '#EC407A',
  anger: '#FF5722',
  anticipation: '#90A4AE',
};

export const EMOTION_LABELS: Record<string, string> = {
  joy: '喜び',
  trust: '信頼',
  fear: '恐れ',
  surprise: '驚き',
  sadness: '悲しみ',
  disgust: '嫌悪',
  anger: '怒り',
  anticipation: '期待',
};
