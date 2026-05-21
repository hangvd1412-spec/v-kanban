import { useTaskStatistics } from '@/hooks/useTaskStatistics';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle2, Clock, ListTodo } from 'lucide-react';

const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b'];
const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#3b82f6',
  Low: '#10b981'
};

export function Dashboard() {
  const { summary, statusData, priorityData } = useTaskStatistics();

  return (
    <div className="flex-1 w-full max-w-[1400px] mx-auto p-6 overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-300 scrollbar-thin scrollbar-thumb-white/20">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        Tổng quan Dự án
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl flex items-center gap-4">
          <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <ListTodo size={28} />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Tổng số Thẻ</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalTasks}</p>
          </div>
        </div>
        
        <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl flex items-center gap-4">
          <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Đã hoàn thành</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.completedTasks}</p>
          </div>
        </div>

        <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl flex items-center gap-4">
          <div className="p-4 bg-rose-500/20 text-rose-400 rounded-xl">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Quá hạn</p>
            <p className="text-3xl font-bold text-rose-400">{summary.overdueTasks}</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        {/* Status Donut Chart */}
        <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">Trạng thái công việc</h3>
          <div className="flex-1 min-h-[300px]">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">Chưa có dữ liệu</div>
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {statusData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                {entry.name}: {entry.value}
              </div>
            ))}
          </div>
        </div>

        {/* Priority Bar Chart */}
        <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">Mức độ ưu tiên</h3>
          <div className="flex-1 min-h-[300px]">
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: '#334155', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">Chưa có dữ liệu</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
