// =============================================================================
// NutriPulse — Nutrition Store (Zustand)
// =============================================================================
import { create } from 'zustand';
import api from '@/services/api';

export interface FoodEntry {
  id: string;
  food_name: string;
  quantity_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  source?: string;
  matched_score?: number;
}

export interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  bmr?: number;
  tdee?: number;
}

export interface ProfileData {
  gender: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity: string;
  goal: string;
  custom_calories?: number | null;
}

interface NutritionState {
  entries: FoodEntry[];
  goals: Goals;
  insights: string[];
  profile: ProfileData;
  isLoading: boolean;

  fetchTotals: () => Promise<void>;
  addFood: (foodName: string, quantity: number) => Promise<any>;
  addAiEntry: (foodName: string, quantityG: number, nutrition: any) => Promise<any>;
  deleteEntry: (id: string) => Promise<void>;
  clearLog: () => Promise<void>;
  updateProfile: (data: ProfileData) => Promise<any>;
  searchFoods: (query: string) => Promise<any[]>;
}

const defaultGoals: Goals = { calories: 2000, protein: 150, carbs: 250, fats: 65 };
const defaultProfile: ProfileData = {
  gender: 'male', age: 25, height_cm: 175, weight_kg: 70,
  activity: 'moderate', goal: 'maintain',
};

export const useNutritionStore = create<NutritionState>((set, get) => ({
  entries: [],
  goals: defaultGoals,
  insights: [],
  profile: defaultProfile,
  isLoading: false,

  fetchTotals: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/get_totals');
      const { entries, goals, insights, profile } = res.data;
      set({
        entries: entries || [],
        goals: goals || defaultGoals,
        insights: insights || [],
        profile: profile || defaultProfile,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  addFood: async (foodName, quantity) => {
    const res = await api.post('/add_food', { food_name: foodName, quantity });
    const { entry, insights, goals } = res.data;
    if (entry) {
      set((s) => ({
        entries: [...s.entries, entry],
        insights: insights || s.insights,
        goals: goals || s.goals,
      }));
    }
    return res.data;
  },

  addAiEntry: async (foodName, quantityG, nutrition) => {
    const res = await api.post('/add_ai_entry', {
      food_name: foodName,
      quantity_g: quantityG,
      nutrition,
    });
    const { entry, insights, goals } = res.data;
    if (entry) {
      set((s) => ({
        entries: [...s.entries, entry],
        insights: insights || s.insights,
        goals: goals || s.goals,
      }));
    }
    return res.data;
  },

  deleteEntry: async (id) => {
    const res = await api.post('/delete_entry', { id });
    set((s) => ({
      entries: s.entries.filter((e) => e.id !== id),
      insights: res.data.insights || s.insights,
      goals: res.data.goals || s.goals,
    }));
  },

  clearLog: async () => {
    await api.post('/clear_log');
    set({ entries: [], insights: [] });
  },

  updateProfile: async (data) => {
    const res = await api.post('/update_profile', data);
    set({ profile: res.data.profile, goals: res.data.goals });
    return res.data;
  },

  searchFoods: async (query) => {
    const res = await api.get('/search_foods', { params: { q: query } });
    return res.data.results || [];
  },
}));
