// =============================================================================
// NutriPulse — Water Store (Zustand)
// =============================================================================
import { create } from 'zustand';
import api from '@/services/api';

interface WaterState {
  consumedMl: number;
  goalMl: number;
  isLoading: boolean;

  setWater: (consumed: number, goal: number) => void;
  addWater: (ml: number) => Promise<void>;
  resetWater: () => Promise<void>;
}

export const useWaterStore = create<WaterState>((set) => ({
  consumedMl: 0,
  goalMl: 2500,
  isLoading: false,

  setWater: (consumed, goal) => set({ consumedMl: consumed, goalMl: goal }),

  addWater: async (ml) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/add_water', { ml });
      const water = res.data.water;
      set({
        consumedMl: water.consumed_ml,
        goalMl: water.goal_ml,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  resetWater: async () => {
    set({ isLoading: true });
    try {
      const res = await api.post('/reset_water');
      const water = res.data.water;
      set({
        consumedMl: water.consumed_ml,
        goalMl: water.goal_ml,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },
}));
