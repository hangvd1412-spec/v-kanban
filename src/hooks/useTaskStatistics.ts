import { useMemo } from 'react';
import { useKanbanStore } from '@/store/kanbanStore';

export function useTaskStatistics() {
  const { tasks, columns } = useKanbanStore();

  return useMemo(() => {
    const totalTasks = tasks.length;
    let completedTasks = 0;
    let overdueTasks = 0;

    const statusMap: Record<string, number> = {};
    columns.forEach(col => {
      statusMap[col.title] = 0;
    });

    const priorityMap = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tasks.forEach(task => {
      const isCompleted = task.progress === 100 || (columns.length > 0 && task.columnId === columns[columns.length - 1].id);
      if (isCompleted) {
        completedTasks++;
      }

      if (task.deadlineDate && !isCompleted) {
        const dDate = new Date(task.deadlineDate);
        if (dDate < today) {
          overdueTasks++;
        }
      }

      const col = columns.find(c => c.id === task.columnId);
      if (col) {
        statusMap[col.title]++;
      }

      if (task.priority) {
        priorityMap[task.priority]++;
      } else {
        priorityMap.Medium++;
      }
    });

    const statusData = Object.entries(statusMap)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
      
    const priorityData = Object.entries(priorityMap)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);

    return {
      summary: {
        totalTasks,
        completedTasks,
        overdueTasks,
      },
      statusData,
      priorityData,
    };
  }, [tasks, columns]);
}
