import { create } from "zustand";

interface KanbanState {
  // 1. ADD "summary" TO THE TYPE
  currentView: "summary" | "board" | "list" | "timeline";
  columnsOrder: string[];
  tabsOrder: { id: string; label: string }[];
  taskOrder: Record<string, string[]>;
  listColumns: {
    key: string;
    label: string;
    defaultWidth: number;
    type: string;
  }[];

  // 2. ADD "summary" TO THE SETTER
  setCurrentView: (view: "summary" | "board" | "list" | "timeline") => void;
  setColumnsOrder: (order: string[]) => void;
  setTabsOrder: (tabs: { id: string; label: string }[]) => void;
  setTaskOrder: (order: Record<string, string[]>) => void;
  setListColumns: (cols: any[]) => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  // 3. SET THE DEFAULT VIEW AND TAB ORDER
  currentView: "summary",
  columnsOrder: ["To do", "In Progress", "In Review", "Done"],
  tabsOrder: [
    { id: "summary", label: "Summary" }, // <--- ADDED HERE
    { id: "list", label: "List" },
    { id: "board", label: "Board" },
  ],
  taskOrder: {},

  // --- DEFAULT LIST COLUMNS ---
  listColumns: [
    { key: "title", label: "Work", defaultWidth: 350, type: "text" },
    {
      key: "assignee_name",
      label: "Assignee",
      defaultWidth: 200,
      type: "text",
    },
    { key: "priority", label: "Priority", defaultWidth: 130, type: "priority" },
    { key: "status", label: "Status", defaultWidth: 150, type: "text" },
    { key: "start_date", label: "Start date", defaultWidth: 140, type: "date" },
    { key: "deadline", label: "Due date", defaultWidth: 140, type: "date" },
  ],

  setCurrentView: (view) => set({ currentView: view }),
  setColumnsOrder: (order) => set({ columnsOrder: order }),
  setTabsOrder: (tabs) => set({ tabsOrder: tabs }),
  setTaskOrder: (order) => set({ taskOrder: order }),

  // --- ACTION ---
  setListColumns: (cols) => set({ listColumns: cols }),
}));
