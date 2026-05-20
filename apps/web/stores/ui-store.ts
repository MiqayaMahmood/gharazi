import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UiStore = {
  mobileFiltersOpen: boolean;
  mobileMenuOpen: boolean;
  setMobileFiltersOpen: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  mobileFiltersOpen: false,
  mobileMenuOpen: false,
  setMobileFiltersOpen: (mobileFiltersOpen) => set({ mobileFiltersOpen }),
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
}));

type CompareStore = {
  listingIds: string[];
  projectIds: string[];
  addListing: (id: string) => void;
  removeListing: (id: string) => void;
  clearListings: () => void;
  addProject: (id: string) => void;
  removeProject: (id: string) => void;
  clearProjects: () => void;
};

export const useCompareStore = create<CompareStore>()(
  persist(
    (set) => ({
      listingIds: [],
      projectIds: [],
      addListing: (id) => set((state) => ({ listingIds: limit([...state.listingIds.filter((item) => item !== id), id]) })),
      removeListing: (id) => set((state) => ({ listingIds: state.listingIds.filter((item) => item !== id) })),
      clearListings: () => set({ listingIds: [] }),
      addProject: (id) => set((state) => ({ projectIds: limit([...state.projectIds.filter((item) => item !== id), id]) })),
      removeProject: (id) => set((state) => ({ projectIds: state.projectIds.filter((item) => item !== id) })),
      clearProjects: () => set({ projectIds: [] }),
    }),
    { name: 'Gharazi-compare' },
  ),
);

function limit(items: string[]) {
  return items.slice(-4);
}
