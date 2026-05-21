'use client';

import { useState, useEffect } from 'react';
import { Task, Subtask, Priority, Id, Attachment } from '@/types';
import { useKanbanStore } from '@/store/kanbanStore';
import { X, Plus, Trash2, Save, Edit2, Eye, AlertTriangle, Clock, Paperclip, FileText, Image as ImageIcon, FileArchive, UploadCloud } from 'lucide-react';
import { generateId, getDeadlineStatus, cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTask: Task | null;
  defaultColumnId: Id;
}

export function TaskModal({ isOpen, onClose, initialTask, defaultColumnId }: TaskModalProps) {
  const { addTask, updateTask } = useKanbanStore();
  
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [tableData, setTableData] = useState<string[][]>([]);
  const [initRows, setInitRows] = useState(3);
  const [initCols, setInitCols] = useState(3);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const { t } = useTranslation();
  
  const { columns } = useKanbanStore();
  const isDone = columns.length > 0 && initialTask?.columnId === columns[columns.length - 1].id;
  const deadlineStatus = isDone ? 'NORMAL' : getDeadlineStatus(deadlineDate, deadlineTime);
  
  const createTable = () => {
    const rows = Math.max(1, Math.min(20, initRows));
    const cols = Math.max(1, Math.min(20, initCols));
    
    const newTable = Array.from({ length: rows }, (_, rowIndex) => {
      if (rowIndex === 0) {
        return Array.from({ length: cols }, (_, colIndex) => `Tiêu đề ${colIndex + 1}`);
      }
      return Array(cols).fill('');
    });
    setTableData(newTable);
  };

  const addColumn = () => {
    setTableData(prev => prev.map(row => [...row, '']));
  };

  const addRow = () => {
    if (tableData.length === 0) return;
    setTableData(prev => [...prev, new Array(prev[0].length).fill('')]);
  };

  const deleteTable = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ bảng dữ liệu?')) {
      setTableData([]);
    }
  };

  const updateTableCell = (rowIndex: number, colIndex: number, value: string) => {
    setTableData(prev => {
      const newData = [...prev];
      newData[rowIndex] = [...newData[rowIndex]];
      newData[rowIndex][colIndex] = value;
      return newData;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setIsUploading(true);
    const newAttachments: Attachment[] = [];
    
    for (const file of Array.from(e.target.files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'kanban_files');
      
      try {
        const response = await fetch('https://api.cloudinary.com/v1_1/dmmftdznr/upload', {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        
        if (data.secure_url) {
          newAttachments.push({
            id: generateId().toString(),
            name: data.original_filename || file.name,
            size: file.size,
            type: file.type,
            url: data.secure_url
          });
        }
      } catch (error) {
        console.error("Cloudinary upload failed:", error);
      }
    }
    
    setAttachments(prev => [...prev, ...newAttachments]);
    setIsUploading(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setTitle(initialTask.title);
        setDesc(initialTask.desc || '');
        setTagsStr(initialTask.tags?.join(', ') || '');
        setPriority(initialTask.priority || 'Medium');
        setDeadlineDate(initialTask.deadlineDate || '');
        setDeadlineTime(initialTask.deadlineTime || '');
        setSubtasks(initialTask.subtasks || []);
        setTableData(initialTask.tableData || []);
        setAttachments(initialTask.attachments || []);
      } else {
        // Reset form for new task
        setTitle('');
        setDesc('');
        setTagsStr('');
        setPriority('Medium');
        setDeadlineDate('');
        setDeadlineTime('');
        setSubtasks([]);
        setTableData([]);
        setAttachments([]);
        setIsUploading(false);
        setInitRows(3);
        setInitCols(3);
      }
    }
  }, [isOpen, initialTask]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim()) return;

    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t !== '');
    
    // Auto-calculate progress based on subtasks
    let progress = initialTask?.progress || 0;
    if (subtasks.length > 0) {
      const completed = subtasks.filter(st => st.isCompleted).length;
      progress = Math.round((completed / subtasks.length) * 100);
    }

    const taskData: Partial<Task> = {
      title: title.trim(),
      desc: desc.trim(),
      tags,
      priority,
      deadlineDate,
      deadlineTime,
      subtasks,
      progress,
      tableData: tableData.length > 0 ? tableData : undefined,
      attachments: attachments.length > 0 ? attachments : undefined
    };

    if (initialTask) {
      updateTask(initialTask.id, taskData);
    } else {
      addTask({
        id: generateId(),
        columnId: defaultColumnId,
        pinned: false,
        ...(taskData as Omit<Task, 'id' | 'columnId'>)
      } as Task);
    }

    onClose();
  };

  const addSubtask = () => {
    setSubtasks([...subtasks, { id: generateId(), title: '', isCompleted: false }]);
  };

  const updateSubtaskTitle = (id: Id, newTitle: string) => {
    setSubtasks(subtasks.map(st => st.id === id ? { ...st, title: newTitle } : st));
  };

  const removeSubtask = (id: Id) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/5">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            {initialTask ? t('editCard') : t('addCard')}
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 text-slate-700 dark:text-gray-200 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/20">
          
          {deadlineStatus === 'OVERDUE' && initialTask && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-500 text-red-600 dark:text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm font-medium">
              <AlertTriangle size={16} /> {t('overdueAlert')}
            </div>
          )}
          {deadlineStatus === 'DUE_SOON' && initialTask && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-500 text-red-600 dark:text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm font-medium">
              <Clock size={16} /> {t('dueSoonAlert')}
            </div>
          )}
          
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-gray-300">{t('title')} <span className="text-red-500 dark:text-red-400">*</span></label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white dark:bg-black/30 border border-black/20 dark:border-white/10 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder={`${t('title')}...`}
              autoFocus
            />
          </div>


          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-gray-300">{t('description')}</label>
              <div className="flex items-center gap-1 bg-black/5 dark:bg-black/20 p-1 rounded-md">
                <button 
                  onClick={() => setIsPreview(false)}
                  className={cn("px-2 py-1 text-xs font-medium rounded flex items-center gap-1 transition-colors", !isPreview ? "bg-white shadow-sm dark:bg-white/10 text-slate-800 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white")}
                >
                  <Edit2 size={12} /> {t('edit')}
                </button>
                <button 
                  onClick={() => setIsPreview(true)}
                  className={cn("px-2 py-1 text-xs font-medium rounded flex items-center gap-1 transition-colors", isPreview ? "bg-white shadow-sm dark:bg-white/10 text-slate-800 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white")}
                >
                  <Eye size={12} /> {t('preview')}
                </button>
              </div>
            </div>
            
            {!isPreview ? (
              <textarea 
                value={desc} 
                onChange={e => setDesc(e.target.value)}
                className="w-full bg-white dark:bg-black/30 border border-black/20 dark:border-white/10 rounded-lg p-2.5 text-slate-900 dark:text-white h-28 resize-y focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder={t('descPlaceholder')}
              />
            ) : (
              <div className="w-full bg-gray-50 dark:bg-black/10 border border-black/10 dark:border-white/5 rounded-lg p-3 text-slate-700 dark:text-gray-200 min-h-[112px] prose dark:prose-invert max-w-none">
                {desc ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => (
                        <a
                          {...props}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 dark:text-blue-400 hover:underline truncate inline-block max-w-[200px] align-bottom"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )
                    }}
                  >
                    {desc}
                  </ReactMarkdown>
                ) : (
                  <span className="text-gray-500 italic">Chưa có mô tả...</span>
                )}
              </div>
            )}
          </div>

          {/* Dynamic Table */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-gray-300">{t('tableData')}</label>
              {tableData.length > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={addColumn} className="flex items-center gap-1 text-xs px-2 py-1 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded transition-colors text-slate-600 dark:text-gray-300">
                    <Plus size={12} /> {t('col')}
                  </button>
                  <button onClick={addRow} className="flex items-center gap-1 text-xs px-2 py-1 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded transition-colors text-slate-600 dark:text-gray-300">
                    <Plus size={12} /> {t('row')}
                  </button>
                  <button onClick={deleteTable} className="flex items-center gap-1 text-xs px-2 py-1 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded transition-colors ml-2">
                    <Trash2 size={12} /> {t('delete')}
                  </button>
                </div>
              )}
            </div>
            
            {tableData.length === 0 ? (
              <div className="w-full p-5 border-2 border-dashed border-black/10 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-black/10 flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-500 dark:text-gray-400">{t('cols')}</label>
                  <input 
                    type="number" 
                    min="1" max="20"
                    value={initCols}
                    onChange={e => setInitCols(parseInt(e.target.value) || 1)}
                    className="w-16 bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded p-1.5 text-slate-900 dark:text-white text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-500 dark:text-gray-400">{t('rows')}</label>
                  <input 
                    type="number" 
                    min="1" max="20"
                    value={initRows}
                    onChange={e => setInitRows(parseInt(e.target.value) || 1)}
                    className="w-16 bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded p-1.5 text-slate-900 dark:text-white text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button 
                  onClick={createTable}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors"
                >
                  {t('createTable')}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-white/10">
                      {tableData[0].map((header, colIdx) => (
                        <th key={`header-${colIdx}`} className="border-b border-r border-black/10 dark:border-white/10 last:border-r-0 font-semibold p-0">
                          <input 
                            type="text"
                            value={header}
                            onChange={(e) => updateTableCell(0, colIdx, e.target.value)}
                            className="w-full bg-transparent p-2 text-slate-900 dark:text-white outline-none focus:bg-black/5 dark:focus:bg-white/5 transition-colors"
                            placeholder={`${t('col')} ${colIdx + 1}`}
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.slice(1).map((row, rowIdx) => (
                      <tr key={`row-${rowIdx}`} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        {row.map((cell, colIdx) => (
                          <td key={`cell-${rowIdx}-${colIdx}`} className="border-r border-black/5 dark:border-white/5 last:border-r-0 p-0">
                            <input 
                              type="text"
                              value={cell}
                              onChange={(e) => updateTableCell(rowIdx + 1, colIdx, e.target.value)}
                              className="w-full bg-transparent p-2 text-slate-700 dark:text-gray-300 focus:text-slate-900 dark:focus:text-white outline-none focus:bg-black/5 dark:focus:bg-white/5 transition-colors"
                              placeholder="..."
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* File Attachments */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-gray-300">{t('attachments')}</label>
            </div>
            
            <label className={cn(
              "w-full p-6 border-2 border-dashed border-black/10 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-black/10 flex flex-col items-center justify-center gap-2 transition-colors group",
              isUploading ? "opacity-70 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-black/20 cursor-pointer"
            )}>
              <div className="p-3 bg-white dark:bg-white/5 shadow-sm dark:shadow-none rounded-full group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 text-gray-400 transition-colors">
                {isUploading ? <UploadCloud size={24} className="animate-bounce" /> : <UploadCloud size={24} />}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium group-hover:text-gray-700 dark:group-hover:text-gray-300">
                {isUploading ? 'Đang tải lên...' : t('dropFile')}
              </p>
              <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} />
            </label>

            {attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {attachments.map(file => (
                  <div key={file.id} className="flex items-center gap-3 bg-white dark:bg-black/20 border border-black/10 dark:border-white/5 rounded-lg p-3 group hover:bg-gray-50 dark:hover:bg-black/30 transition-colors shadow-sm dark:shadow-none">
                    {file.type.startsWith('image/') ? (
                      <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 border border-black/5 dark:border-white/10 bg-black/5">
                        <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 rounded-lg shrink-0">
                        <FileText size={20} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-800 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 truncate font-medium block transition-colors">
                        {file.name}
                      </a>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button 
                      onClick={() => removeAttachment(file.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-transparent rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title={t('delete')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-gray-300">{t('priority')}</label>
              <select 
                value={priority} 
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 [&>option]:bg-white dark:[&>option]:bg-slate-800"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-gray-300">{t('tags')}</label>
              <input 
                type="text" 
                value={tagsStr} 
                onChange={e => setTagsStr(e.target.value)}
                className="w-full bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder={t('tagsPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-gray-300">{t('deadline')}</label>
              <input 
                type="date" 
                value={deadlineDate} 
                onChange={e => setDeadlineDate(e.target.value)}
                className="w-full bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-gray-300">{t('deadline')}</label>
              <input 
                type="time" 
                value={deadlineTime} 
                onChange={e => setDeadlineTime(e.target.value)}
                className="w-full bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-black/10 dark:border-white/10">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-slate-700 dark:text-gray-300">{t('checklist')}</label>
              <button 
                onClick={addSubtask}
                className="text-xs flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/40 px-3 py-1.5 rounded-md transition-colors font-medium"
              >
                <Plus size={14} /> {t('addChecklistItem')}
              </button>
            </div>
            
            {subtasks.length === 0 ? (
              <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-6 text-center border border-black/5 dark:border-white/5 border-dashed">
                <p className="text-sm text-gray-500">{t('emptyChecklist')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {subtasks.map((st) => (
                  <div key={st.id} className="flex items-center gap-2 group">
                    <input 
                      type="text"
                      value={st.title}
                      onChange={e => updateSubtaskTitle(st.id, e.target.value)}
                      className="flex-1 bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-md px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm dark:shadow-none"
                      placeholder={t('subtaskPlaceholder')}
                    />
                    <button 
                      onClick={() => removeSubtask(st.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title={t('delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>

        {/* Footer */}
        <div className="p-5 border-t border-black/10 dark:border-white/10 flex justify-end gap-3 bg-gray-50 dark:bg-black/40">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg font-medium text-slate-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-6 py-2.5 rounded-lg font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
          >
            <Save size={18} /> {initialTask ? t('save') : t('addCard')}
          </button>
        </div>

      </div>
    </div>
  );
}
