import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Column, Task, Id } from '@/types';

interface KanbanState {
  columns: Column[];
  tasks: Task[];
  searchQuery: string;
  theme: 'light' | 'dark';

  setSearchQuery: (query: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  importData: (columns: Column[], tasks: Task[]) => void;
  setBoardData: (columns: Column[], tasks: Task[]) => void;
  
  // Actions Cột (Column)
  addColumn: (column: Column) => void;
  deleteColumn: (id: Id) => void;
  updateColumn: (id: Id, title: string) => void;
  moveColumn: (activeId: Id, overId: Id) => void;

  // Actions Thẻ (Task)
  addTask: (task: Task) => void;
  deleteTask: (id: Id) => void;
  updateTask: (id: Id, taskData: Partial<Task>) => void;
  
  // Logic Ghim (Pinned)
  togglePinTask: (taskId: Id) => void;

  // Logic Kéo thả (Drag & Drop)
  moveTask: (taskId: Id, targetColumnId: Id, newIndex: number) => void;
  
  // Logic Tiến độ (Progress & Subtasks)
  updateSubtaskStatus: (taskId: Id, subtaskIndex: number) => void;

  // Logic Sắp xếp
  sortColumn: (columnId: Id, sortBy: 'deadline' | 'priority') => void;
}

// Helper: Cưỡng ép logic Pinned nằm trên Unpinned cho một cột cụ thể
// Bằng cách sử dụng stable sort, ta giữ nguyên được thứ tự kéo thả của các phần tử 
// nhưng luôn đảm bảo Pinned nổi lên trên.
const enforcePinnedLogic = (tasks: Task[], columnId: Id) => {
  const columnTasks = tasks.filter(t => t.columnId === columnId);
  const otherTasks = tasks.filter(t => t.columnId !== columnId);
  
  // Sắp xếp stable: Pinned = true luôn nổi lên trước
  columnTasks.sort((a, b) => {
    if (a.pinned === b.pinned) return 0;
    return a.pinned ? -1 : 1;
  });
  
  return [...otherTasks, ...columnTasks];
};

export const defaultColumns: Column[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'done', title: 'Done' }
];

export const defaultTasks: Task[] = [
  {
    id: 't1',
    columnId: 'todo',
    title: 'Thiết kế giao diện',
    desc: 'Sử dụng Tailwind CSS và glassmorphism tham khảo https://ui.shadcn.com',
    tags: ['UI/UX', 'Design'],
    deadlineDate: '2026-06-01',
    priority: 'High',
    pinned: true,
    subtasks: [
      { id: 'st1', title: 'Tạo Layout chuẩn', isCompleted: true },
      { id: 'st2', title: 'Phối màu Glassmorphism', isCompleted: false },
    ],
    progress: 50
  },
  {
    id: 't2',
    columnId: 'in-progress',
    title: 'Tích hợp DnD Kit',
    desc: 'Xử lý logic kéo thả mượt mà giữa các cột',
    tags: ['Frontend', 'Logic'],
    priority: 'Critical',
    pinned: false
  },
  {
    id: 't3',
    columnId: 'todo',
    title: 'Tối ưu hiệu năng Store',
    desc: 'Sử dụng Zustand với immutable logic',
    tags: ['Store', 'Zustand'],
    priority: 'Medium',
    pinned: false
  }
];

export const useKanbanStore = create<KanbanState>()(
  persist(
    (set, get) => ({
  columns: defaultColumns,
  tasks: defaultTasks,
  searchQuery: '',
  theme: 'dark',
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTheme: (theme) => set({ theme }),
  importData: (columns, tasks) => set({ columns, tasks }),
  setBoardData: (columns, tasks) => set({ columns, tasks }),

  addColumn: (column) => set((state) => ({ columns: [...state.columns, column] })),
  
  deleteColumn: (id) => set((state) => ({
    columns: state.columns.filter((col) => col.id !== id),
    tasks: state.tasks.filter((task) => task.columnId !== id)
  })),

  updateColumn: (id, title) => set((state) => ({
    columns: state.columns.map((col) => col.id === id ? { ...col, title } : col)
  })),

  moveColumn: (activeId, overId) => set((state) => {
    const activeIndex = state.columns.findIndex(c => c.id === activeId);
    const overIndex = state.columns.findIndex(c => c.id === overId);
    
    if (activeIndex === -1 || overIndex === -1) return state;
    
    const newColumns = [...state.columns];
    const [movedColumn] = newColumns.splice(activeIndex, 1);
    newColumns.splice(overIndex, 0, movedColumn);
    
    return { columns: newColumns };
  }),

  addTask: (task) => set((state) => {
    const newTasks = [...state.tasks, task];
    return { tasks: enforcePinnedLogic(newTasks, task.columnId) };
  }),

  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((task) => task.id !== id)
  })),

  updateTask: (id, taskData) => set((state) => {
    const newTasks = state.tasks.map((task) => task.id === id ? { ...task, ...taskData } : task);
    const task = newTasks.find(t => t.id === id);
    if (task) {
        return { tasks: enforcePinnedLogic(newTasks, task.columnId) };
    }
    return { tasks: newTasks };
  }),

  togglePinTask: (taskId) => set((state) => {
    const newTasks = state.tasks.map((task) => 
      task.id === taskId ? { ...task, pinned: !task.pinned } : task
    );
    const task = newTasks.find(t => t.id === taskId);
    if (task) {
      return { tasks: enforcePinnedLogic(newTasks, task.columnId) };
    }
    return { tasks: newTasks };
  }),

  moveTask: (taskId, targetColumnId, newIndex) => set((state) => {
    const taskIndex = state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return state;

    const taskToMove = { ...state.tasks[taskIndex], columnId: targetColumnId };
    
    // Tách riêng task đang xét ra khỏi mảng
    const remainingTasks = state.tasks.filter(t => t.id !== taskId);
    
    // Tìm các task của cột đích
    const targetColumnTasks = remainingTasks.filter(t => t.columnId === targetColumnId);
    const otherTasks = remainingTasks.filter(t => t.columnId !== targetColumnId);
    
    // Chèn task vào vị trí mới tại cột đích
    targetColumnTasks.splice(newIndex, 0, taskToMove);
    
    // Ép logic Pinned: Nếu user cố tình thả thẻ Pinned xuống dưới thẻ Unpinned,
    // hàm sort này sẽ tự động đẩy nó trở lại lên trên các thẻ Unpinned.
    targetColumnTasks.sort((a, b) => {
      if (a.pinned === b.pinned) return 0;
      return a.pinned ? -1 : 1;
    });

    return { tasks: [...otherTasks, ...targetColumnTasks] };
  }),

  updateSubtaskStatus: (taskId, subtaskIndex) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return state;

    // Cập nhật trạng thái subtask
    const newSubtasks = task.subtasks.map((st, idx) => 
      idx === subtaskIndex ? { ...st, isCompleted: !st.isCompleted } : st
    );

    // Tính toán Progress mới
    const completedCount = newSubtasks.filter(st => st.isCompleted).length;
    const progress = Math.round((completedCount / newSubtasks.length) * 100);

    let newColumnId = task.columnId;
    
    // Auto Move logic: Nếu đạt 100%, chuyển sang cột cuối cùng (thường là Done)
    if (progress === 100 && state.columns.length > 0) {
      const lastColumn = state.columns[state.columns.length - 1];
      if (task.columnId !== lastColumn.id) {
        newColumnId = lastColumn.id;
      }
    }

    const updatedTask = { 
      ...task, 
      subtasks: newSubtasks, 
      progress,
      columnId: newColumnId 
    };

    let newTasks = state.tasks.map(t => t.id === taskId ? updatedTask : t);

    // Nếu thay đổi cột, cưỡng ép sort cho cả 2 cột để đảm bảo Pinned không bị phá vỡ
    if (task.columnId !== newColumnId) {
      newTasks = enforcePinnedLogic(newTasks, task.columnId);
      newTasks = enforcePinnedLogic(newTasks, newColumnId);
    } else {
      newTasks = enforcePinnedLogic(newTasks, task.columnId);
    }

    return { tasks: newTasks };
  }),

  sortColumn: (columnId, sortBy) => set((state) => {
    const columnTasks = state.tasks.filter(t => t.columnId === columnId);
    const otherTasks = state.tasks.filter(t => t.columnId !== columnId);
    
    const pinned = columnTasks.filter(t => t.pinned);
    const unpinned = columnTasks.filter(t => !t.pinned);

    const priorityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };

    const sortFn = (a: Task, b: Task) => {
      if (sortBy === 'priority') {
        const pA = a.priority ? priorityWeight[a.priority] || 0 : 0;
        const pB = b.priority ? priorityWeight[b.priority] || 0 : 0;
        return pB - pA; // Cao nhất lên đầu
      } else {
        if (!a.deadlineDate && !b.deadlineDate) return 0;
        if (!a.deadlineDate) return 1;
        if (!b.deadlineDate) return -1;
        return new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime(); // Gần nhất lên đầu
      }
    };

    pinned.sort(sortFn);
    unpinned.sort(sortFn);

    return { tasks: [...otherTasks, ...pinned, ...unpinned] };
  })
}),
  {
    name: 'kanban-storage',
  }
));
