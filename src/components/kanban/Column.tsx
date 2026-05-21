'use client';

import { Column as ColumnType } from '@/types';
import { useKanbanStore } from '@/store/kanbanStore';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './TaskCard';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, ArrowUpDown, Filter, Check, Trash2 } from 'lucide-react';
import { Task } from '@/types';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ColumnProps {
  column: ColumnType;
  onAddClick: () => void;
  onTaskClick: (task: Task) => void;
}

export function Column({ column, onAddClick, onTaskClick }: ColumnProps) {
  const { tasks, sortColumn, searchQuery, deleteColumn } = useKanbanStore();
  const { t } = useTranslation();
  
  // Logic to translate known column titles
  const getDisplayTitle = (title: string) => {
    const key = title.toLowerCase().replace(' ', '');
    if (['todo', 'inprogress', 'done'].includes(key)) {
      return t(key);
    }
    return title;
  };
  
  const [filterType, setFilterType] = useState<'all' | 'this_week' | 'this_month' | 'tag'>('all');
  const [filterTag, setFilterTag] = useState('');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Lấy toàn bộ tag độc nhất từ tất cả tasks
  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [tasks]);

  // Chỉ lấy tasks thuộc về cột này
  const columnTasks = useMemo(() => {
    return tasks.filter(t => t.columnId === column.id);
  }, [tasks, column.id]);

  // Áp dụng bộ lọc hiển thị
  const filteredTasks = useMemo(() => {
    let result = columnTasks;
    
    if (filterType !== 'all') {
      result = result.filter(task => {
        if (filterType === 'tag') {
          return task.tags?.includes(filterTag);
        }
        
        if (!task.deadlineDate) return false;
        const dDate = new Date(task.deadlineDate);
        const today = new Date();
        
        if (filterType === 'this_week') {
          const first = today.getDate() - today.getDay();
          const startOfWeek = new Date(today.setDate(first));
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          return dDate >= startOfWeek && dDate <= endOfWeek;
        }
        
        if (filterType === 'this_month') {
          return dDate.getMonth() === new Date().getMonth() && dDate.getFullYear() === new Date().getFullYear();
        }
        
        return true;
      });
    }

    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(task => {
        return (
          task.title.toLowerCase().includes(lowerQuery) ||
          (task.desc && task.desc.toLowerCase().includes(lowerQuery)) ||
          (task.tags && task.tags.some(t => t.toLowerCase().includes(lowerQuery)))
        );
      });
    }

    return result;
  }, [columnTasks, filterType, filterTag, searchQuery]);

  const taskIds = useMemo(() => {
    return filteredTasks.map(t => t.id);
  }, [filteredTasks]);

  // Vùng droppable và sortable cho cả cột
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    }
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style}
        className="flex flex-col flex-1 rounded-2xl bg-white/5 border-2 border-dashed border-indigo-500/50 opacity-30 h-full min-h-[500px]"
      />
    );
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="flex flex-col flex-1 min-w-[320px] rounded-2xl bg-white/80 dark:bg-slate-800/40 backdrop-blur-md border border-gray-200 dark:border-slate-700/50 shadow-sm overflow-hidden h-full min-h-0"
    >
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700/50 flex justify-between items-center bg-white/40 dark:bg-transparent group">
        <h2 
          {...attributes}
          {...listeners}
          className="font-bold text-slate-800 dark:text-gray-100 flex items-center gap-2 flex-1 cursor-grab active:cursor-grabbing"
        >
          {getDisplayTitle(column.title)}
          <span className="text-xs bg-black/10 dark:bg-white/10 px-2 py-1 rounded-full text-gray-700 dark:text-gray-300 font-medium">
            {columnTasks.length}
          </span>
        </h2>
        <div className="flex bg-black/5 dark:bg-black/20 p-1 rounded-lg opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity items-center gap-1">
          {/* Delete Column */}
          <button 
            onClick={() => {
              if (window.confirm(t('confirmDeleteCol'))) {
                deleteColumn(column.id);
              }
            }}
            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            title={t('delete')}
          >
            <Trash2 size={16} />
          </button>
          
          <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-0.5"></div>

          {/* Sort Menu */}
          <div className="relative">
            <button 
              onClick={() => { setIsSortOpen(!isSortOpen); setIsFilterOpen(false); }}
              className="p-1 rounded text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title="Sắp xếp"
            >
              <ArrowUpDown size={16} />
            </button>
            {isSortOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-lg shadow-xl py-1 z-[100] overflow-hidden">
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 dark:hover:text-white" onClick={() => { sortColumn(column.id, 'deadline'); setIsSortOpen(false); }}>Theo Hạn chót</button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 dark:hover:text-white" onClick={() => { sortColumn(column.id, 'priority'); setIsSortOpen(false); }}>Theo Ưu tiên</button>
              </div>
            )}
          </div>

          {/* Filter Menu */}
          <div className="relative">
            <button 
              onClick={() => { setIsFilterOpen(!isFilterOpen); setIsSortOpen(false); }}
              className={cn(
                "p-1 rounded transition-colors",
                filterType !== 'all' ? "text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-500/20" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-black/10 dark:hover:bg-white/10"
              )} 
              title="Lọc"
            >
              <Filter size={16} />
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-lg shadow-xl py-1 z-[100] overflow-hidden max-h-60 overflow-y-auto scrollbar-thin">
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 dark:hover:text-white flex justify-between items-center" onClick={() => { setFilterType('all'); setIsFilterOpen(false); }}>
                  Hiện tất cả {filterType === 'all' && <Check size={14} className="text-indigo-400"/>}
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 dark:hover:text-white flex justify-between items-center" onClick={() => { setFilterType('this_week'); setIsFilterOpen(false); }}>
                  Tuần này {filterType === 'this_week' && <Check size={14} className="text-indigo-400"/>}
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 dark:hover:text-white flex justify-between items-center" onClick={() => { setFilterType('this_month'); setIsFilterOpen(false); }}>
                  Tháng này {filterType === 'this_month' && <Check size={14} className="text-indigo-400"/>}
                </button>
                {uniqueTags.length > 0 && <div className="border-t border-black/5 dark:border-white/10 my-1"></div>}
                {uniqueTags.map(tag => (
                  <button key={tag} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 dark:hover:text-white flex justify-between items-center" onClick={() => { setFilterType('tag'); setFilterTag(tag); setIsFilterOpen(false); }}>
                    <span className="truncate">Tag: {tag}</span>
                    {filterType === 'tag' && filterTag === tag && <Check size={14} className="text-indigo-400 shrink-0"/>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={onAddClick}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Thêm thẻ mới"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
      
      {/* Column Body - Droppable Area */}
      <div 
        className="flex flex-col gap-4 flex-1 p-3 overflow-y-auto overflow-x-hidden min-h-[150px]"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {filteredTasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
