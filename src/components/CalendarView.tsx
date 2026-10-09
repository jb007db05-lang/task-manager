import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface CalendarTask {
  id: string;
  title: string;
  date?: string;
  priority?: string;
  status?: string;
}

interface CalendarViewProps {
  tasks: CalendarTask[];
  onTaskClick?: (task: CalendarTask) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Map tasks by date YYYY-MM-DD
  const tasksByDate: Record<string, typeof tasks> = {};
  tasks.forEach((t) => {
    if (t.date) {
      tasksByDate[t.date] = tasksByDate[t.date] || [];
      tasksByDate[t.date].push(t);
    }
  });

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-slate-100">
            {monthNames[month]} {year}
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={prevMonth}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-medium text-slate-400">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-2">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="h-28 bg-slate-950/40 rounded-xl border border-slate-900" />
        ))}
        {daysArray.map((day) => {
          const formattedDay = day < 10 ? `0${day}` : `${day}`;
          const formattedMonth = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
          const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
          const dayTasks = tasksByDate[dateStr] || [];

          return (
            <div
              key={`day-${day}`}
              className="h-28 bg-slate-950/80 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div className="text-xs font-bold text-slate-400">{day}</div>
              <div className="space-y-1 overflow-y-auto max-h-20">
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onTaskClick?.(t)}
                    className="text-[11px] font-medium bg-blue-950/60 border border-blue-800/50 text-blue-300 px-1.5 py-0.5 rounded truncate cursor-pointer hover:bg-blue-900/60 transition"
                    title={t.title}
                  >
                    {t.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
