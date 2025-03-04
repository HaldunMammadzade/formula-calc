import { create } from "zustand";

interface FormulaStore {
  formula: string[];
  addTag: (tag: string) => void;
  removeLastTag: () => void;
}

export const useFormulaStore = create<FormulaStore>((set) => ({
  formula: [],
  addTag: (tag) =>
    set((state) => ({ formula: [...state.formula, tag] })),
  removeLastTag: () =>
    set((state) => ({ formula: state.formula.slice(0, -1) })),
}));
