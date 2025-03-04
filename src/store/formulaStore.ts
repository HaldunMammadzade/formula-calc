import { create } from "zustand";

interface FormulaTag {
  id: string;
  name: string;
  value: number;
  category: string;
}

type FormulaItem = FormulaTag | string;

interface FormulaStore {
  formula: FormulaItem[];
  addTag: (tag: FormulaItem) => void;
  removeLastTag: () => void;
}

export const useFormulaStore = create<FormulaStore>((set) => ({
  formula: [],
  addTag: (tag) =>
    set((state) => ({ formula: [...state.formula, tag] })),
  removeLastTag: () =>
    set((state) => ({ formula: state.formula.slice(0, -1) })),
}));
