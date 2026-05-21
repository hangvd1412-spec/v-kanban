'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import { useKanbanStore } from '@/store/kanbanStore';
import { Pin, Trash2, Calendar, AlertTriangle, Clock, Paperclip } from 'lucide-react';
import { cn, getDeadlineStatus } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TaskCardProps {
  task: Task;
  isOverlay?: boolean;
  onClick?: () => void;
}

export function TaskCard({ task, isOverlay, onClick }: TaskCardProps) {
  const { columns, updateSubtaskStatus, togglePinTask, deleteTask } = useKanbanStore();
  
  const isDone = columns.length > 0 && task.columnId === columns[columns.length - 1].id;
  const deadlineStatus = isDone ? 'NORMAL' : getDeadlineStatus(task.deadlineDate, task.deadlineTime);
  
  const sortable = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = sortable;

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const priorityColor = 
    task.priority === 'Critical' ? 'bg-red-500' :
    task.priority === 'High' ? 'bg-orange-500' :
    task.priority === 'Medium' ? 'bg-blue-500' : 'bg-gray-400';



  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 border-2 border-dashed border-indigo-500/50 rounded-xl p-4 min-h-[120px] bg-white/40 dark:bg-white/5"
      />
    );
  }

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? undefined : style}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      onClick={isOverlay ? undefined : onClick}
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl p-4 overflow-hidden shrink-0",
        isOverlay ? "cursor-grabbing scale-105 shadow-2xl ring-2 ring-indigo-500/50 z-50" : "cursor-grab active:cursor-grabbing",
        "bg-white dark:bg-slate-800 backdrop-blur-md shadow-md dark:shadow-lg transition-colors duration-200 border",
        task.pinned 
          ? "border-yellow-500/50 bg-yellow-50 dark:border-yellow-400/30 dark:bg-yellow-400/5" 
          : "border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700",
        (deadlineStatus === 'OVERDUE' || deadlineStatus === 'DUE_SOON') ? "ring-2 ring-red-500 shadow-red-500/20 border-red-500" : ""
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", priorityColor)} />
      
      {/* Header: Title and Actions */}
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-gray-100 text-base leading-tight flex-1">
          {task.title}
        </h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); togglePinTask(task.id); }}
            className={cn("p-1 rounded transition-colors", task.pinned ? "text-yellow-600 bg-yellow-500/20 dark:text-yellow-400 dark:bg-yellow-400/10" : "text-gray-500 hover:bg-black/10 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white")}
            title="Ghim thẻ"
          >
            <Pin size={14} className={task.pinned ? "fill-current" : ""} />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { 
              e.stopPropagation(); 
              if(window.confirm('Bạn có chắc chắn muốn xóa thẻ này?')) {
                deleteTask(task.id); 
              }
            }}
            className="p-1 rounded text-gray-500 hover:text-rose-600 hover:bg-rose-100 dark:text-gray-400 dark:hover:text-rose-400 dark:hover:bg-rose-400/10 transition-colors"
            title="Xóa thẻ"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag, idx) => (
            <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-300">
              {tag}
            </span>
          ))}
        </div>
      )}


      {/* Description */}
      {task.desc && (
        <div className="text-sm text-gray-700 dark:text-gray-200 prose dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => (
                <a
                  {...props}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 dark:text-blue-400 hover:underline truncate inline-block max-w-[200px] align-bottom"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                />
              )
            }}
          >
            {task.desc}
          </ReactMarkdown>
        </div>
      )}

      {/* Dynamic Table (Read Only) */}
      {task.tableData && task.tableData.length > 0 && (
        <div className="mt-2 overflow-x-auto rounded-lg border border-black/10 dark:border-white/10 scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-200 dark:bg-white/10">
                {task.tableData[0].map((header, idx) => (
                  <th key={idx} className="p-2 border-b border-black/10 dark:border-white/10 font-semibold text-slate-700 dark:text-gray-200">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {task.tableData.slice(1).map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="p-2 text-slate-600 dark:text-gray-300">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Subtasks */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          {task.subtasks.map((st, idx) => (
            <div key={st.id} className="flex items-start gap-2" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={st.isCompleted}
                onChange={(e) => { e.stopPropagation(); updateSubtaskStatus(task.id, idx); }}
                className="w-3.5 h-3.5 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className={cn("text-sm flex-1 cursor-pointer select-none", st.isCompleted ? "line-through text-gray-500" : "text-gray-700 dark:text-gray-200")} onClick={(e) => { e.stopPropagation(); updateSubtaskStatus(task.id, idx); }}>
                {st.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Progress & Meta footer */}
      <div className="flex items-end justify-between mt-auto pt-2 gap-3">
        <div className="flex-1 w-full">
          {task.progress !== undefined && task.subtasks && task.subtasks.length > 0 && (
             <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
               <div
                 className={cn("h-1.5 rounded-full transition-all duration-500", 
                   task.progress === 100 ? "bg-green-500" : "bg-indigo-500"
                 )}
                 style={{ width: `${task.progress}%` }}
               />
             </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-md" title={`${task.attachments.length} tài liệu đính kèm`}>
              <Paperclip size={12} />
              <span>{task.attachments.length}</span>
            </div>
          )}

          {task.deadlineDate && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md shrink-0",
            (deadlineStatus === 'OVERDUE' || deadlineStatus === 'DUE_SOON') ? "text-red-500 border border-red-500 bg-red-50 dark:bg-red-500/10" :
            "text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800"
          )}>
            {(deadlineStatus === 'OVERDUE' || deadlineStatus === 'DUE_SOON') ? <AlertTriangle size={12} className="text-red-500" /> :
             <Calendar size={12} className="text-gray-400" />}
            {task.deadlineDate}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
