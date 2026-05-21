'use client';

import { useKanbanStore } from '@/store/kanbanStore';
import { Column } from './Column';
import { Search, KanbanSquare, BarChart3, Sun, Moon, Download, Upload, Settings, Layout, Plus, X, LogIn, LogOut } from 'lucide-react';
import { Dashboard } from './Dashboard';
import '@/i18n';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useRef } from 'react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Column as ColumnType } from '@/types';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { useState, useEffect } from 'react';
import { Task, Id } from '@/types';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { useAuthStore } from '@/store/authStore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { defaultColumns, defaultTasks } from '@/store/kanbanStore';

export function Board() {
  const { columns, tasks, moveTask, moveColumn, searchQuery, setSearchQuery, theme, setTheme, setBoardData, addColumn } = useKanbanStore();
  const { currentUser, isAuthLoading, setUser } = useAuthStore();
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kanban_lang', lang);
    }
  };
  const [viewMode, setViewMode] = useState<'board' | 'dashboard'>('board');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeColumnIdForModal, setActiveColumnIdForModal] = useState<Id>('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBoardLoading, setIsBoardLoading] = useState(true);
  
  const isSyncingRef = useRef(false);
  const activeColumnInfo = activeColumnIdForModal ? columns.find(c => c.id === activeColumnIdForModal) : null;
  
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Firestore Initial Load
  useEffect(() => {
    if (isAuthLoading) return;
    
    if (currentUser) {
      const fetchBoard = async () => {
        setIsBoardLoading(true);
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
             const data = docSnap.data();
             isSyncingRef.current = true;
             setBoardData(data.columns || [], data.tasks || []);
             setTimeout(() => { isSyncingRef.current = false; }, 100);
          } else {
             // Create default
             await setDoc(docRef, JSON.parse(JSON.stringify({ columns: defaultColumns, tasks: defaultTasks })));
             isSyncingRef.current = true;
             setBoardData(defaultColumns, defaultTasks);
             setTimeout(() => { isSyncingRef.current = false; }, 100);
          }
        } catch (e) {
          console.error("Error fetching board:", e);
        }
        setIsBoardLoading(false);
      }
      fetchBoard();
    } else {
      isSyncingRef.current = true;
      setBoardData(defaultColumns, defaultTasks);
      setTimeout(() => { isSyncingRef.current = false; }, 100);
      setIsBoardLoading(false);
    }
  }, [currentUser, isAuthLoading, setBoardData]);

  // Firestore Auto-Sync (Debounced)
  useEffect(() => {
     if (isBoardLoading || isAuthLoading || !currentUser || isSyncingRef.current) return;
     
     const timer = setTimeout(() => {
        const docRef = doc(db, 'users', currentUser.uid);
        updateDoc(docRef, JSON.parse(JSON.stringify({ columns, tasks }))).catch(e => console.error("Error saving board:", e));
     }, 500);
     return () => clearTimeout(timer);
  }, [columns, tasks, currentUser, isBoardLoading, isAuthLoading]);

  // Auth Status listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, [setUser]);

  useEffect(() => {
    function handleClickOutsideProfile(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutsideProfile);
    }
    return () => document.removeEventListener('mousedown', handleClickOutsideProfile);
  }, [isProfileOpen]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsProfileOpen(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };
  
  const handleAddColumn = () => {
    if (newColumnTitle.trim()) {
      addColumn({
        id: 'col-' + Date.now(),
        title: newColumnTitle.trim()
      });
      setNewColumnTitle('');
      setIsAddingColumn(false);
    }
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleExport = () => {
    const data = { columns, tasks };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kanban-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json.columns) && Array.isArray(json.tasks)) {
          importData(json.columns, json.tasks);
          alert('Khôi phục dữ liệu thành công!');
        } else {
          alert('File JSON không hợp lệ. Vui lòng kiểm tra lại cấu trúc.');
        }
      } catch (error) {
        alert('Lỗi khi đọc file. File có thể bị hỏng hoặc không đúng định dạng JSON.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenNewTask = (columnId: Id) => {
    setEditingTask(null);
    setActiveColumnIdForModal(columnId);
    setIsModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setActiveColumnIdForModal(task.columnId);
    setIsModalOpen(true);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const customCollisionDetection: CollisionDetection = (args) => {
    // Ưu tiên va chạm bằng con trỏ chuột (pointer)
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    // Nếu con trỏ không nằm trong vùng nào, dùng giao cắt hình chữ nhật
    return rectIntersection(args);
  };

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type;

    if (type === 'Column') {
      const col = columns.find(c => c.id === active.id);
      if (col) setActiveColumn(col);
      return;
    }

    if (type === 'Task') {
      const task = tasks.find((t) => t.id === active.id);
      if (task) setActiveTask(task);
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return; // Column doesn't swap on dragOver, it swaps on dragEnd

    if (isOverTask) {
      const targetColumnId = over.data.current?.task.columnId;
      const activeTask = tasks.find(t => t.id === activeId);
      if (activeTask && activeTask.columnId !== targetColumnId) {
        const columnTasks = tasks.filter(t => t.columnId === targetColumnId);
        const overIndex = columnTasks.findIndex(t => t.id === overId);
        moveTask(activeId, targetColumnId, overIndex);
      }
    } else if (isOverColumn) {
      const targetColumnId = overId;
      const activeTask = tasks.find(t => t.id === activeId);
      if (activeTask && activeTask.columnId !== targetColumnId) {
        const columnTasks = tasks.filter(t => t.columnId === targetColumnId);
        moveTask(activeId, targetColumnId, columnTasks.length);
      }
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    setActiveColumn(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveColumn = active.data.current?.type === 'Column';
    if (isActiveColumn) {
      moveColumn(activeId, overId);
      return;
    }

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    if (isOverTask) {
      const targetColumnId = over.data.current?.task.columnId;
      const columnTasks = tasks.filter(t => t.columnId === targetColumnId);
      const overIndex = columnTasks.findIndex(t => t.id === overId);
      moveTask(activeId, targetColumnId, overIndex);
    } else if (isOverColumn) {
      const targetColumnId = overId;
      const columnTasks = tasks.filter(t => t.columnId === targetColumnId);
      moveTask(activeId, targetColumnId, columnTasks.length);
    }
  };

  // Cấu hình animation chuẩn cho DragOverlay
  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  if (!isMounted) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="h-screen w-full bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-hidden flex flex-col">
        {/* Global Search Header */}
        <div className="h-16 shrink-0 border-b border-black/5 dark:border-white/10 bg-white/20 dark:bg-black/20 flex items-center px-6 shadow-md z-10 relative">
          
          <button 
            onClick={() => setViewMode('board')}
            className="flex items-center gap-2 shrink-0 cursor-pointer transition-opacity hover:opacity-80 focus:outline-none"
          >
            <Layout className="text-blue-500" size={24} />
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent select-none">
              V-Kanban
            </h1>
          </button>

          <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-lg px-4">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/40 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-gray-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-gray-500"
            />
          </div>
          
          <div className="flex items-center gap-2 shrink-0 relative ml-auto">
            {/* Add Column Button */}
            <button 
              onClick={() => setIsAddingColumn(true)}
              className="flex items-center gap-1 p-2 rounded-lg text-gray-700 dark:text-gray-300 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors text-sm font-medium mr-1"
              title={t('addColumn')}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">{t('addColumn')}</span>
            </button>

            {/* Settings Dropdown */}
            <div className="relative" ref={settingsDropdownRef}>
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Cài đặt"
              >
                <Settings size={20} />
              </button>

              {isSettingsOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 border border-black/5 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 border-b border-black/5 dark:border-white/10">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t('language')}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {['vi', 'en', 'zh', 'ja', 'ko', 'es'].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => { handleLanguageChange(lang); setIsSettingsOpen(false); }}
                        className={cn(
                          "px-2 py-1.5 rounded-md text-xs font-bold flex items-center justify-center transition-colors uppercase",
                          i18n.language === lang 
                            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30" 
                            : "bg-gray-50 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 border border-transparent"
                        )}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2 border-b border-black/5 dark:border-white/10 flex flex-col gap-1">
                  <button 
                    onClick={() => { setViewMode(viewMode === 'dashboard' ? 'board' : 'dashboard'); setIsSettingsOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {viewMode === 'dashboard' ? <KanbanSquare size={16} className="text-indigo-500" /> : <BarChart3 size={16} className="text-indigo-500" />}
                      {t('dashboard')}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {viewMode === 'dashboard' ? t('board') : t('dashboard')}
                    </span>
                  </button>

                  <button 
                    onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setIsSettingsOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {theme === 'dark' ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-orange-400" />}
                      {t('theme')}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {theme === 'dark' ? t('dark') : t('light')}
                    </span>
                  </button>
                </div>

                <div className="p-2 flex flex-col gap-1">
                  <button 
                    onClick={() => { handleExport(); setIsSettingsOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Download size={16} className="text-gray-400" /> {t('export')}
                  </button>
                  <button 
                    onClick={() => { fileInputRef.current?.click(); setIsSettingsOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Upload size={16} className="text-gray-400" /> {t('import')}
                  </button>
                </div>
              </div>
            )}
            
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              onChange={handleImport} 
              className="hidden" 
            />
            </div>

            {/* Auth UI */}
            <div className="relative ml-2 pl-2 border-l border-black/10 dark:border-white/10 flex items-center" ref={profileDropdownRef}>
              {isAuthLoading ? (
                <div className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 animate-pulse"></div>
              ) : currentUser ? (
                <>
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 font-bold overflow-hidden border border-black/5 dark:border-white/10 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt={currentUser.displayName || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}</span>
                    )}
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-black/5 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-3 border-b border-black/5 dark:border-white/10">
                        <div className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{currentUser.displayName || 'User'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{currentUser.email}</div>
                      </div>
                      <div className="p-2">
                        <button 
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <LogOut size={16} /> {t('logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm"
                >
                  <LogIn size={16} /> {t('login')}
                </button>
              )}
            </div>
          </div>
        </div>

        {viewMode === 'board' ? (
          <div className="flex w-full h-full gap-6 overflow-x-auto p-6">
            {isBoardLoading ? (
              <div className="flex w-full h-full gap-6 items-start">
                {[1, 2, 3].map((skeleton) => (
                  <div key={skeleton} className="flex-1 min-w-[320px] h-[70vh] rounded-2xl bg-white/40 dark:bg-white/5 animate-pulse border border-white/40 dark:border-white/10" />
                ))}
              </div>
            ) : (
              <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                {columns.map((col) => (
                  <Column 
                    key={col.id} 
                    column={col} 
                    onAddClick={() => handleOpenNewTask(col.id)}
                    onTaskClick={handleOpenEditTask}
                  />
                ))}
              </SortableContext>
            )}
          </div>
        ) : (
          <Dashboard />
        )}
      </div>
      
      {/* Overlay: Hiệu ứng thẻ/cột nổi lên khi đang kéo */}
      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? (
          <div className="opacity-100" style={{ width: '100%', maxWidth: '420px' }}>
            <TaskCard task={activeTask} isOverlay={true} />
          </div>
        ) : activeColumn ? (
          <div className="opacity-100 w-[350px]">
            <Column 
              column={activeColumn} 
              onAddClick={() => {}} 
              onTaskClick={() => {}} 
            />
          </div>
        ) : null}
      </DragOverlay>

      {/* Task Modal for Add/Edit */}
      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTask={editingTask}
        defaultColumnId={activeColumnIdForModal}
      />
      
      {/* Add Column Modal */}
      {isAddingColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 mx-4 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">{t('addColumn')}</h2>
            <input
              type="text"
              autoFocus
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddColumn();
                if (e.key === 'Escape') {
                  setIsAddingColumn(false);
                  setNewColumnTitle('');
                }
              }}
              className="w-full bg-white dark:bg-black/30 border border-black/20 dark:border-white/10 rounded-lg p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors mb-6"
              placeholder={t('enterColName')}
            />
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => { setIsAddingColumn(false); setNewColumnTitle(''); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={handleAddColumn}
                disabled={!newColumnTitle.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                {t('createCol')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
