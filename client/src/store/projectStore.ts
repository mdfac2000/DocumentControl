import { create } from 'zustand'

const LS_KEY = 'selectedProjectIds'

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(ids: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(ids))
}

interface ProjectState {
  selectedHubId: string | null
  selectedProjectIds: string[]
  setHub: (hubId: string) => void
  toggleProject: (projectId: string) => void
  selectAll: (projectIds: string[]) => void
  deselectAll: () => void
  reset: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  selectedHubId: null,
  selectedProjectIds: loadFromStorage(),
  setHub: (hubId) => set({ selectedHubId: hubId }),
  toggleProject: (projectId) =>
    set((state) => {
      const ids = state.selectedProjectIds.includes(projectId)
        ? state.selectedProjectIds.filter((id) => id !== projectId)
        : [...state.selectedProjectIds, projectId]
      saveToStorage(ids)
      return { selectedProjectIds: ids }
    }),
  selectAll: (projectIds) => {
    saveToStorage(projectIds)
    return set({ selectedProjectIds: projectIds })
  },
  deselectAll: () => {
    saveToStorage([])
    return set({ selectedProjectIds: [] })
  },
  reset: () => {
    saveToStorage([])
    return set({ selectedHubId: null, selectedProjectIds: [] })
  },
}))
