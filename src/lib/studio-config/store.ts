"use client";

import { create, type StateCreator } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";

import type { StudioConfig } from "./types";

export type StudioConfigUpdater = (config: StudioConfig) => StudioConfig;

export type StudioStore = {
  config: StudioConfig | null;
  setConfig: (config: StudioConfig) => void;
  updateConfig: (updater: StudioConfigUpdater) => void;
  clearConfig: () => void;
};

export type StudioStoreApi = StoreApi<StudioStore>;

const createStudioState = (
  initialConfig: StudioConfig | null,
): StateCreator<StudioStore> =>
  (set) => ({
    config: initialConfig,
    setConfig: (config) => set({ config }),
    updateConfig: (updater) =>
      set((state) => {
        if (state.config === null) {
          return state;
        }

        return { config: updater(state.config) };
      }),
    clearConfig: () => set({ config: null }),
  });

/** Creates an isolated store for tests or a scoped Studio provider. */
export const createStudioStore = (
  initialConfig: StudioConfig | null = null,
): StudioStoreApi => createStore<StudioStore>()(createStudioState(initialConfig));

/** Client-side Studio state. Generators receive StudioConfig directly instead. */
export const useStudioStore = create<StudioStore>()(createStudioState(null));