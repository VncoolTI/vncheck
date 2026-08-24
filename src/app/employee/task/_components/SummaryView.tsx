import React, { useMemo } from "react";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  DocumentPlusIcon,
  CalendarIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

export default function SummaryView({
  listTasks,
  user,
  userName,
}: {
  listTasks: any[];
  user: any;
  userName: string;
}) {
  const stats = useMemo(() => {
    const total = listTasks.length;
    const completed = listTasks.filter((t) => t.status === "Done").length;
    const inProgress = listTasks.filter(
      (t) => t.status === "In Progress",
    ).length;
    const inReview = listTasks.filter((t) => t.status === "In Review").length;
    const toDo = listTasks.filter((t) => t.status === "To do").length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    let overdue = 0;
    let dueSoon = 0;

    listTasks.forEach((t) => {
      if (t.status === "Done") return;
      if (t.deadline || t.task_date) {
        const d = new Date(t.deadline || t.task_date);
        d.setHours(0, 0, 0, 0);
        if (d < today) overdue++;
        else if (d >= today && d <= nextWeek) dueSoon++;
      }
    });

    const priorities = {
      Highest: listTasks.filter((t) => t.priority === "Highest").length,
      High: listTasks.filter((t) => t.priority === "High").length,
      Medium: listTasks.filter((t) => t.priority === "Medium" || !t.priority)
        .length,
      Low: listTasks.filter((t) => t.priority === "Low").length,
      Lowest: listTasks.filter((t) => t.priority === "Lowest").length,
    };
    const maxPriority = Math.max(...Object.values(priorities), 1);

    const assignees: Record<string, { total: number; done: number }> = {};
    listTasks.forEach((t) => {
      const name = t.assignee_name || "Unassigned";
      if (!assignees[name]) assignees[name] = { total: 0, done: 0 };
      assignees[name].total += 1;
      if (t.status === "Done") assignees[name].done += 1;
    });
    const assigneeArray = Object.keys(assignees)
      .map((name) => ({ name, ...assignees[name] }))
      .sort((a, b) => b.total - a.total);

    const workTypesMap: Record<string, { count: number; color: string }> = {};
    listTasks.forEach((t) => {
      const wt = t.work_types;
      const key = wt?.name || "Standard Task";
      if (!workTypesMap[key])
        workTypesMap[key] = { count: 0, color: wt?.icon_color || "#3B82F6" };
      workTypesMap[key].count += 1;
    });
    const workTypesArray = Object.keys(workTypesMap)
      .map((key) => ({
        name: key,
        ...workTypesMap[key],
        pct: Math.round((workTypesMap[key].count / (total || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Get 5 most recent tasks (assuming higher ID = newer)
    const recentTasks = [...listTasks]
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, 5);

    return {
      total,
      completed,
      inProgress,
      inReview,
      toDo,
      overdue,
      dueSoon,
      priorities,
      maxPriority,
      assigneeArray,
      workTypesArray,
      recentTasks,
    };
  }, [listTasks]);

  const getDonutSegments = () => {
    if (stats.total === 0) return null;

    const donePct = (stats.completed / stats.total) * 100;
    const reviewPct = (stats.inReview / stats.total) * 100;
    const progressPct = (stats.inProgress / stats.total) * 100;
    const todoPct = (stats.toDo / stats.total) * 100;

    return (
      <svg
        viewBox="0 0 42 42"
        className="w-40 h-40 transform -rotate-90 drop-shadow-md"
      >
        <circle
          cx="21"
          cy="21"
          r="15.91549430918954"
          fill="transparent"
          stroke="#2A2E33"
          strokeWidth="6"
        ></circle>
        <circle
          cx="21"
          cy="21"
          r="15.91549430918954"
          fill="transparent"
          stroke="#10B981"
          strokeWidth="6"
          strokeDasharray={`${donePct} ${100 - donePct}`}
          strokeDashoffset="0"
        ></circle>
        <circle
          cx="21"
          cy="21"
          r="15.91549430918954"
          fill="transparent"
          stroke="#F59E0B"
          strokeWidth="6"
          strokeDasharray={`${reviewPct} ${100 - reviewPct}`}
          strokeDashoffset={`-${donePct}`}
        ></circle>
        <circle
          cx="21"
          cy="21"
          r="15.91549430918954"
          fill="transparent"
          stroke="#3B82F6"
          strokeWidth="6"
          strokeDasharray={`${progressPct} ${100 - progressPct}`}
          strokeDashoffset={`-${donePct + reviewPct}`}
        ></circle>
        <circle
          cx="21"
          cy="21"
          r="15.91549430918954"
          fill="transparent"
          stroke="#A855F7"
          strokeWidth="6"
          strokeDasharray={`${todoPct} ${100 - todoPct}`}
          strokeDashoffset={`-${donePct + reviewPct + progressPct}`}
        ></circle>
      </svg>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#22272B] border border-gray-700/50 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:bg-[#2A2E33] transition-colors cursor-default">
          <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">
              {stats.completed}
            </div>
            <div className="text-gray-500 text-xs">Total completed</div>
          </div>
        </div>
        <div className="bg-[#22272B] border border-gray-700/50 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:bg-[#2A2E33] transition-colors cursor-default">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <ExclamationCircleIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">
              {stats.overdue}
            </div>
            <div className="text-gray-500 text-xs">Overdue tasks</div>
          </div>
        </div>
        <div className="bg-[#22272B] border border-gray-700/50 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:bg-[#2A2E33] transition-colors cursor-default">
          <div className="w-10 h-10 rounded-full bg-[#007BFF]/10 border border-[#007BFF]/20 flex items-center justify-center text-[#007BFF]">
            <DocumentPlusIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">
              {stats.total}
            </div>
            <div className="text-gray-500 text-xs">Total work items</div>
          </div>
        </div>
        <div className="bg-[#22272B] border border-gray-700/50 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:bg-[#2A2E33] transition-colors cursor-default">
          <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">
              {stats.dueSoon}
            </div>
            <div className="text-gray-500 text-xs">Due in next 7 days</div>
          </div>
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#22272B] border border-gray-700/50 rounded-xl p-5 shadow-sm">
          <h3 className="text-white font-bold text-base mb-1">
            Status overview
          </h3>
          <p className="text-gray-400 text-xs mb-6">
            Get a snapshot of the current status of all work items.
          </p>
          <div className="flex items-center justify-center gap-12 py-4">
            <div className="relative">
              {getDonutSegments()}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-white leading-none">
                  {stats.total}
                </span>
                <span className="text-[10px] text-gray-400 font-medium w-20 leading-tight mt-1">
                  Total items
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-sm bg-[#10B981]"></div>
                <span className="text-gray-300">Done: {stats.completed}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-sm bg-[#F59E0B]"></div>
                <span className="text-gray-300">
                  In Review: {stats.inReview}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-sm bg-[#3B82F6]"></div>
                <span className="text-gray-300">
                  In Progress: {stats.inProgress}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-sm bg-[#A855F7]"></div>
                <span className="text-gray-300">To Do: {stats.toDo}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#22272B] border border-gray-700/50 rounded-xl p-5 shadow-sm relative">
          <h3 className="text-white font-bold text-base mb-1">
            Assignee Workload
          </h3>
          <p className="text-gray-400 text-xs mb-6">
            See how tasks are distributed across your team members.
          </p>
          <div className="space-y-5 overflow-y-auto max-h-[220px] pr-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
            {stats.assigneeArray.map((assignee, idx) => {
              const initials = assignee.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();
              const pct =
                Math.round((assignee.done / assignee.total) * 100) || 0;
              return (
                <div key={idx} className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-full bg-[#F59E0B] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="font-bold text-sm text-gray-200">
                        {assignee.name}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500">
                        {assignee.done} / {assignee.total} done
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-700/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#10B981] rounded-full transition-all duration-500 group-hover:brightness-110"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#22272B] border border-gray-700/50 rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="text-white font-bold text-base mb-1">
            Priority breakdown
          </h3>
          <p className="text-gray-400 text-xs mb-8">
            Get a holistic view of how work is being prioritized across all
            statuses.
          </p>
          <div className="flex-1 flex items-end gap-2 h-40 border-b border-gray-700 pb-2 relative">
            {/* The Background Lines & Y-Axis Numbers */}
            <div className="absolute left-0 top-0 bottom-0 w-full flex flex-col justify-between text-[10px] text-gray-500 pointer-events-none pb-2">
              <div className="border-t border-gray-700/50 w-full relative">
                <span className="absolute -top-2 -left-4">
                  {stats.maxPriority}
                </span>
              </div>
              <div className="border-t border-gray-700/50 w-full relative">
                <span className="absolute -top-2 -left-4">
                  {Math.ceil(stats.maxPriority / 2)}
                </span>
              </div>
              <div className="w-full relative">
                <span className="absolute -top-2 -left-4">0</span>
              </div>
            </div>

            {/* --- FIX: COLOR CODED BARS WITH PERMANENTLY VISIBLE NUMBERS! --- */}
            <div className="flex-1 flex justify-center ml-4 z-10 h-full items-end">
              <div
                style={{
                  height: `${(stats.priorities.Highest / stats.maxPriority) * 100}%`,
                }}
                className="w-10 bg-red-600 rounded-t-sm hover:brightness-110 transition-colors cursor-default relative"
              >
                {stats.priorities.Highest > 0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-white text-xs font-bold">
                    {stats.priorities.Highest}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 flex justify-center z-10 h-full items-end">
              <div
                style={{
                  height: `${(stats.priorities.High / stats.maxPriority) * 100}%`,
                }}
                className="w-10 bg-red-500 rounded-t-sm hover:brightness-110 transition-colors cursor-default relative"
              >
                {stats.priorities.High > 0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-white text-xs font-bold">
                    {stats.priorities.High}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 flex justify-center z-10 h-full items-end">
              <div
                style={{
                  height: `${(stats.priorities.Medium / stats.maxPriority) * 100}%`,
                }}
                className="w-10 bg-orange-500 rounded-t-sm hover:brightness-110 transition-colors cursor-default relative"
              >
                {stats.priorities.Medium > 0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-white text-xs font-bold">
                    {stats.priorities.Medium}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 flex justify-center z-10 h-full items-end">
              <div
                style={{
                  height: `${(stats.priorities.Low / stats.maxPriority) * 100}%`,
                }}
                className="w-10 bg-blue-500 rounded-t-sm hover:brightness-110 transition-colors cursor-default relative"
              >
                {stats.priorities.Low > 0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-white text-xs font-bold">
                    {stats.priorities.Low}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 flex justify-center z-10 h-full items-end">
              <div
                style={{
                  height: `${(stats.priorities.Lowest / stats.maxPriority) * 100}%`,
                }}
                className="w-10 bg-blue-400 rounded-t-sm hover:brightness-110 transition-colors cursor-default relative"
              >
                {stats.priorities.Lowest > 0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-white text-xs font-bold">
                    {stats.priorities.Lowest}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mt-3 px-2 ml-4 uppercase tracking-wider">
            <span className="flex-1 text-center">Highest</span>
            <span className="flex-1 text-center">High</span>
            <span className="flex-1 text-center">Medium</span>
            <span className="flex-1 text-center">Low</span>
            <span className="flex-1 text-center">Lowest</span>
          </div>
        </div>

        <div className="bg-[#22272B] border border-gray-700/50 rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="text-white font-bold text-base mb-1">Types of work</h3>
          <p className="text-gray-400 text-xs mb-6">
            Get a dynamic breakdown of work items based on your custom types.
          </p>
          <div className="flex text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-3 px-2">
            <div className="w-32">Type</div>
            <div>Distribution</div>
          </div>
          <div className="flex flex-col gap-4 px-2 flex-1 overflow-y-auto max-h-[180px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full pr-2">
            {stats.workTypesArray.map((wt, idx) => (
              <div key={idx} className="flex items-center group">
                <div className="w-32 flex items-center gap-2 text-sm font-medium text-gray-300 truncate pr-2">
                  <div
                    className="w-3 h-3 rounded-sm flex items-center justify-center shrink-0"
                    style={{ backgroundColor: wt.color }}
                  ></div>
                  <span className="truncate">{wt.name}</span>
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 h-3.5 bg-gray-700/50 rounded-full overflow-hidden flex">
                    <div
                      className="h-full group-hover:brightness-110 transition-all duration-300 rounded-full"
                      style={{ width: `${wt.pct}%`, backgroundColor: wt.color }}
                    ></div>
                  </div>
                  <span className="text-xs font-bold text-gray-400 w-8 text-right">
                    {wt.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#22272B] border border-gray-700/50 rounded-xl p-5 shadow-sm mt-6">
        <h3 className="text-white font-bold text-base mb-1">Recent activity</h3>
        <p className="text-gray-400 text-xs mb-6">
          Stay up to date with the latest tasks added to this space.
        </p>

        {stats.recentTasks.length === 0 ? (
          <div className="text-center text-gray-500 py-6 text-sm">
            No recent activity found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.recentTasks.map((task, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-700/50 bg-[#1D2125] hover:bg-[#2A2E33] transition-colors"
              >
                <div className="mt-0.5 bg-[#007BFF]/20 p-1.5 rounded-md text-[#007BFF] shrink-0">
                  <ClockIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate hover:text-[#007BFF] cursor-pointer">
                    VK-{task.id}: {task.title}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-[#F59E0B] flex items-center justify-center text-white text-[8px] font-bold shrink-0 shadow-sm border border-[#22272B]">
                        {task.assignee_name
                          ? task.assignee_name.substring(0, 2).toUpperCase()
                          : "UN"}
                      </div>
                      <span className="text-[10px] text-gray-400 truncate">
                        {task.assignee_name || "Unassigned"}
                      </span>
                    </div>
                    <span className="bg-gray-700 text-gray-300 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm truncate inline-block uppercase">
                      {task.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
