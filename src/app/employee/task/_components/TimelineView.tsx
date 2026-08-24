import React, { useMemo, useRef, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  ChevronDownIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  Bars4Icon,
} from "@heroicons/react/24/outline";

export default function TimelineView({
  listTasks,
  setEditingTask,
  quickCreateCol,
  setQuickCreateCol,
  quickCreateTitle,
  setQuickCreateTitle,
  handleQuickCreateTask,
  resetQuickCreate,
  isCreating,
  handleSaveTaskDetails,
  refetchTasks,
}: any) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const formatDecimalToTime = (decimalHours: number) => {
    if (!decimalHours || decimalHours <= 0) return "-";
    const val = parseFloat(decimalHours.toFixed(4));
    const hrs = Math.floor(val);
    const mins = Math.round((val - hrs) * 60);
    if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h`;
    return `${mins}m`;
  };

  // --- SMART OVERLAY ENGINE ---
  const [popoverConfig, setPopoverConfig] = useState<{
    type: "EST" | "LOG";
    taskId: string;
    task: any;
    top: number;
    left: number;
  } | null>(null);

  // --- ESTIMATED TIME STATE ---
  const [estHours, setEstHours] = useState<string>("");
  const [estMinutes, setEstMinutes] = useState<string>("");
  const [isSavingEst, setIsSavingEst] = useState(false);

  const handleEstTimeSubmit = async () => {
    if (!popoverConfig) return;
    const task = popoverConfig.task;
    const hrs = parseInt(estHours || "0", 10);
    const mins = parseInt(estMinutes || "0", 10);
    const decimalHours = hrs + mins / 60;

    setIsSavingEst(true);
    await handleSaveTaskDetails({ ...task, estimated_hours: decimalHours });
    setPopoverConfig(null);
    setIsSavingEst(false);
  };

  // --- LOGGED TIME STATE ---
  const [logDate, setLogDate] = useState<string>("");
  const [logHours, setLogHours] = useState<string>("");
  const [logMinutes, setLogMinutes] = useState<string>("");
  const [logNote, setLogNote] = useState<string>("");

  const [existingEntryId, setExistingEntryId] = useState<number | null>(null);
  const [isFetchingEntry, setIsFetchingEntry] = useState(false);
  const [isLoggingTime, setIsLoggingTime] = useState(false);

  const activeLogTaskId =
    popoverConfig?.type === "LOG" ? popoverConfig.taskId : null;

  useEffect(() => {
    let isMounted = true;
    if (!activeLogTaskId || !logDate) return;

    const fetchExistingEntry = async () => {
      setIsFetchingEntry(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) setIsFetchingEntry(false);
        return;
      }

      const { data } = await supabase
        .from("time_entries")
        .select("*")
        .eq("task_id", activeLogTaskId)
        .eq("employee_id", user.id)
        .eq("log_date", logDate)
        .maybeSingle();

      if (isMounted) {
        if (data) {
          setExistingEntryId(data.id);
          const hrs = Math.floor(data.hours);
          const mins = Math.round((data.hours - hrs) * 60);
          setLogHours(hrs > 0 ? hrs.toString() : "");
          setLogMinutes(mins > 0 ? mins.toString() : "");
          setLogNote(data.description || "");
        } else {
          setExistingEntryId(null);
          setLogHours("");
          setLogMinutes("");
          setLogNote("");
        }
        setIsFetchingEntry(false);
      }
    };

    fetchExistingEntry();
    return () => {
      isMounted = false;
    };
  }, [activeLogTaskId, logDate]);

  const handleLogTimeSubmit = async () => {
    if (!popoverConfig) return;
    const task = popoverConfig.task;
    const hrs = parseInt(logHours || "0", 10);
    const mins = parseInt(logMinutes || "0", 10);
    const decimalHours = hrs + mins / 60;

    if (decimalHours <= 0 || !logDate) return;

    setIsLoggingTime(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      if (existingEntryId) {
        await supabase
          .from("time_entries")
          .update({
            hours: decimalHours,
            description: logNote || null,
          })
          .eq("id", existingEntryId);
      } else {
        await supabase.from("time_entries").insert({
          task_id: task.id,
          employee_id: user.id,
          hours: decimalHours,
          description: logNote || null,
          log_date: logDate,
        });
      }

      if (refetchTasks) {
        await refetchTasks();
      }
    }

    setPopoverConfig(null);
    setIsLoggingTime(false);
  };

  const handleDeleteEntry = async () => {
    if (!existingEntryId || !popoverConfig) return;

    setIsLoggingTime(true);
    const supabase = createClient();

    await supabase.from("time_entries").delete().eq("id", existingEntryId);

    if (refetchTasks) {
      await refetchTasks();
    }

    setPopoverConfig(null);
    setIsLoggingTime(false);
  };

  const [sortMode, setSortMode] = useState("Custom");
  const [manualOrderIds, setManualOrderIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSort = localStorage.getItem("vn_timeline_sort");
      if (savedSort) setSortMode(savedSort);

      const savedOrder = localStorage.getItem("vn_timeline_order");
      if (savedOrder) setManualOrderIds(JSON.parse(savedOrder));
    }
  }, []);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSortMode(val);
    localStorage.setItem("vn_timeline_sort", val);
  };

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const availableStatuses = useMemo(() => {
    return Array.from(new Set(listTasks.map((t: any) => t.status)));
  }, [listTasks]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const clearFilters = () => {
    setSearchInput("");
    setSelectedStatuses([]);
  };

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("taskId", taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("taskId");
    if (!sourceId || sourceId === targetTaskId) {
      setDraggedTaskId(null);
      return;
    }

    setSortMode("Custom");
    localStorage.setItem("vn_timeline_sort", "Custom");

    const currentVisibleIds = sortedTasks.map((t: any) => String(t.id));
    const sourceIdx = currentVisibleIds.indexOf(sourceId);
    const targetIdx = currentVisibleIds.indexOf(targetTaskId);

    currentVisibleIds.splice(sourceIdx, 1);
    currentVisibleIds.splice(targetIdx, 0, sourceId);

    const allIdsSet = new Set(currentVisibleIds);
    const remainingIds = listTasks
      .map((t: any) => String(t.id))
      .filter((id: string) => !allIdsSet.has(id));
    const finalOrder = [...currentVisibleIds, ...remainingIds];

    setManualOrderIds(finalOrder);
    localStorage.setItem("vn_timeline_order", JSON.stringify(finalOrder));
    setDraggedTaskId(null);
  };

  const sortedTasks = useMemo(() => {
    const filtered = listTasks.filter((task: any) => {
      const matchesSearch =
        task.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        String(task.id).includes(debouncedSearch);
      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(task.status);
      return matchesSearch && matchesStatus;
    });

    if (sortMode === "Earliest") {
      return filtered.sort((a: any, b: any) => {
        const dateA = new Date(
          a.task_date || a.deadline || a.start_date || "9999-12-31",
        ).getTime();
        const dateB = new Date(
          b.task_date || b.deadline || b.start_date || "9999-12-31",
        ).getTime();
        return dateA - dateB;
      });
    } else if (sortMode === "Latest") {
      return filtered.sort((a: any, b: any) => {
        const dateA = new Date(
          a.task_date || a.deadline || a.start_date || "1970-01-01",
        ).getTime();
        const dateB = new Date(
          b.task_date || b.deadline || b.start_date || "1970-01-01",
        ).getTime();
        return dateB - dateA;
      });
    } else {
      return filtered.sort((a: any, b: any) => {
        const idxA = manualOrderIds.indexOf(String(a.id));
        const idxB = manualOrderIds.indexOf(String(b.id));

        if (idxA === -1 && idxB === -1)
          return String(b.id).localeCompare(String(a.id));
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }
  }, [listTasks, debouncedSearch, selectedStatuses, sortMode, manualOrderIds]);

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const [viewScale, setViewScale] = useState("Weeks");
  const [scrollTrigger, setScrollTrigger] = useState(0);

  const [baseDate, setBaseDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const dayWidth = viewScale === "Weeks" ? 48 : viewScale === "Months" ? 16 : 4;

  const { days, todayIndex, startDate } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minD = new Date(baseDate.getFullYear(), 0, 1);
    let totalDays = 730;

    if (viewScale === "Months") {
      minD.setFullYear(baseDate.getFullYear() - 1);
      totalDays = 365 * 4;
    } else if (viewScale === "Years") {
      minD.setFullYear(baseDate.getFullYear() - 5);
      totalDays = 365 * 15;
    }

    const daysArray = [];
    let foundTodayIndex = -1;

    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(minD);
      currentDate.setDate(minD.getDate() + i);
      if (currentDate.getTime() === today.getTime()) foundTodayIndex = i;

      daysArray.push({
        date: currentDate,
        dayNum: currentDate.getDate(),
        monthStr: currentDate.toLocaleString("default", { month: "short" }),
        dayNameStr: currentDate.toLocaleString("default", { weekday: "short" }),
        isToday: currentDate.getTime() === today.getTime(),
        isFirstOfMonth: currentDate.getDate() === 1,
        isFirstOfYear:
          currentDate.getDate() === 1 && currentDate.getMonth() === 0,
        dayOfWeek: currentDate.getDay(),
      });
    }
    return { days: daysArray, todayIndex: foundTodayIndex, startDate: minD };
  }, [baseDate, viewScale]);

  const scrollToToday = () => {
    const today = new Date();
    setBaseDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setViewScale("Weeks");
    setScrollTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (scrollRef.current && todayIndex !== -1) {
      const scrollPosition =
        todayIndex * dayWidth - scrollRef.current.clientWidth / 2 + 24;
      scrollRef.current.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: "smooth",
      });
    }
  }, [baseDate, todayIndex, dayWidth, scrollTrigger]);

  const getTaskStyle = (task: any) => {
    if (!task.start_date || (!task.task_date && !task.deadline)) return null;

    const taskStart = new Date(task.start_date);
    taskStart.setHours(0, 0, 0, 0);
    const taskEnd = new Date(task.task_date || task.deadline);
    taskEnd.setHours(0, 0, 0, 0);

    const timelineEnd = new Date(startDate);
    timelineEnd.setDate(startDate.getDate() + days.length);
    if (taskEnd < startDate || taskStart > timelineEnd)
      return { display: "none" };

    const startDiffDays = Math.floor(
      (taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    let durationDays =
      Math.floor(
        (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;
    let offsetDays = startDiffDays;

    if (offsetDays < 0) {
      durationDays += offsetDays;
      offsetDays = 0;
    }
    if (offsetDays + durationDays > days.length) {
      durationDays = days.length - offsetDays;
    }

    return {
      left: `${offsetDays * dayWidth}px`,
      width: `${Math.max(durationDays, 1) * dayWidth}px`,
    };
  };

  return (
    <div className="w-full h-[calc(100vh-220px)] bg-[#1D2125] border border-gray-700 rounded-xl overflow-hidden shadow-sm flex flex-col animate-in fade-in duration-300 relative">
      <div className="bg-[#22272B] px-4 py-3 border-b border-gray-700 flex items-center gap-3 shrink-0 z-30">
        <div className="flex items-center gap-2 border-r border-gray-700 pr-4 mr-1">
          <span className="text-xs font-bold text-gray-400">Sort:</span>
          <select
            value={sortMode}
            onChange={handleSortChange}
            className="bg-[#1D2125] border border-gray-600 text-xs font-bold text-[#007BFF] rounded px-2 py-1.5 outline-none hover:brightness-125 cursor-pointer"
          >
            <option value="Custom">Custom Order</option>
            <option value="Earliest">Earliest Due</option>
            <option value="Latest">Latest Due</option>
          </select>
        </div>

        <div className="flex items-center bg-[#1D2125] border border-gray-600 rounded px-1 py-1 mr-2 shadow-inner">
          <button
            onClick={() =>
              setBaseDate(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
              )
            }
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <div className="relative w-32 flex justify-center items-center">
            <input
              type="month"
              value={`${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}`}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m] = e.target.value.split("-");
                  setBaseDate(new Date(parseInt(y), parseInt(m) - 1, 1));
                }
              }}
              className="bg-transparent text-sm font-bold text-[#007BFF] outline-none cursor-pointer w-full text-center scheme:dark hover:brightness-125 transition-all"
            />
          </div>
          <button
            onClick={() =>
              setBaseDate(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
              )
            }
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#1D2125] border border-gray-600 rounded flex items-center px-3 py-1.5 w-56 focus-within:border-[#007BFF] transition-colors">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 mr-2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search timeline"
            className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-gray-500"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setIsStatusOpen(!isStatusOpen)}
            className={`text-sm font-medium transition-colors flex items-center gap-1.5 border px-3 py-1.5 rounded ${selectedStatuses.length > 0 ? "bg-[#007BFF]/10 text-[#007BFF] border-[#007BFF]/50" : "bg-[#1D2125] text-gray-300 border-gray-600 hover:text-white"}`}
          >
            Status
            {selectedStatuses.length > 0 && (
              <span className="bg-[#007BFF] text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                {selectedStatuses.length}
              </span>
            )}
            <ChevronDownIcon className="w-3 h-3 ml-1" />
          </button>
          {isStatusOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsStatusOpen(false)}
              ></div>
              <div className="absolute top-full left-0 mt-1 w-56 bg-[#282E33] border border-gray-700 shadow-2xl rounded-lg py-2 z-40 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-700/50 mb-1">
                  Filter by Status
                </div>
                {availableStatuses.map((status) => (
                  <label
                    key={status as string}
                    className="flex items-center px-4 py-2 hover:bg-[#38414A] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status as string)}
                      onChange={() => toggleStatus(status as string)}
                      className="mr-3 rounded border-gray-500 bg-transparent text-[#007BFF] focus:ring-[#007BFF] cursor-pointer"
                    />
                    <span className="text-sm text-gray-200">
                      {status as string}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-40 flex items-center bg-[#22272B] border border-gray-700 rounded-lg shadow-2xl p-1 gap-1">
        <button
          onClick={scrollToToday}
          className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-[#38414A] rounded transition-colors"
        >
          Today
        </button>
        <div className="w-px h-4 bg-gray-600 mx-1"></div>
        <button
          onClick={() => setViewScale("Weeks")}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${viewScale === "Weeks" ? "bg-[#007BFF]/20 text-[#007BFF]" : "text-gray-300 hover:text-white hover:bg-[#38414A]"}`}
        >
          Weeks
        </button>
        <button
          onClick={() => setViewScale("Months")}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${viewScale === "Months" ? "bg-[#007BFF]/20 text-[#007BFF]" : "text-gray-300 hover:text-white hover:bg-[#38414A]"}`}
        >
          Months
        </button>
        <button
          onClick={() => setViewScale("Years")}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${viewScale === "Years" ? "bg-[#007BFF]/20 text-[#007BFF]" : "text-gray-300 hover:text-white hover:bg-[#38414A]"}`}
        >
          Years
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <div
          onScroll={() => {
            if (popoverConfig) setPopoverConfig(null);
          }}
          className="w-[580px] border-r border-gray-700 flex flex-col bg-[#1D2125] shrink-0 z-20 shadow-[4px_0_10px_rgba(0,0,0,0.1)] overflow-y-auto [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-[#1D2125] [&::-webkit-scrollbar-corner]:bg-[#1D2125]"
        >
          <div className="h-14 border-b border-gray-700 flex items-end px-4 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-[#22272B] sticky top-0 z-30">
            <div className="flex-1 pl-6">Work</div>
            <div className="w-8 text-center"></div>
            <div className="w-16 text-left pl-2">Start</div>
            <div className="w-16 text-left pl-2">Due</div>
            <div className="w-[60px] text-center">Est.</div>
            <div className="w-[60px] text-center">Log.</div>
          </div>

          <div className="flex-col pb-24">
            {sortedTasks.map((task: any) => (
              <div
                key={task.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, String(task.id))}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, String(task.id))}
                className={`h-10 shrink-0 border-b border-gray-700/50 flex items-center px-4 transition-colors group ${draggedTaskId === String(task.id) ? "bg-[#007BFF]/10 opacity-50" : "hover:bg-[#2A2E33]"}`}
              >
                <div className="w-6 flex items-center justify-center shrink-0">
                  <Bars4Icon
                    className="w-4 h-4 text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                  />
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                  <span className="text-[#007BFF] font-medium text-xs shrink-0">
                    VK-{task.id}
                  </span>
                  <span className="text-gray-200 text-sm truncate group-hover:text-white">
                    {task.title}
                  </span>
                </div>

                <div className="w-8 flex justify-center items-center">
                  <button
                    onClick={() => setEditingTask(task)}
                    title="Edit Task"
                    className="p-1 rounded text-gray-500 hover:text-[#007BFF] hover:bg-[#007BFF]/10 transition-colors opacity-100"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-16 text-left pl-2 text-xs font-medium text-gray-400 truncate">
                  {formatShortDate(task.start_date)}
                </div>
                <div className="w-16 text-left pl-2 text-xs font-medium text-gray-400 truncate">
                  {formatShortDate(task.task_date || task.deadline)}
                </div>

                {/* --- POPOVER BUTTON: ESTIMATED HOURS --- */}
                <div className="w-[60px] flex justify-center">
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const popHeight = 180;
                      let calculatedTop = rect.bottom + 6;

                      // BOUNDARY FIX: Check if it flips off screen, then enforce minimum top padding
                      if (calculatedTop + popHeight > window.innerHeight) {
                        calculatedTop = rect.top - popHeight - 6;
                        if (calculatedTop < 10) calculatedTop = 10;
                      }

                      setPopoverConfig({
                        type: "EST",
                        taskId: task.id,
                        task: task,
                        top: calculatedTop,
                        left: Math.max(10, rect.right - 240),
                      });

                      const hrs = Math.floor(task.estimated_hours || 0);
                      const mins = Math.round(
                        ((task.estimated_hours || 0) - hrs) * 60,
                      );
                      setEstHours(hrs > 0 ? hrs.toString() : "");
                      setEstMinutes(mins > 0 ? mins.toString() : "");
                    }}
                    className={`w-full hover:bg-gray-700/50 text-center text-[11px] font-bold outline-none rounded transition-all py-0.5 cursor-pointer whitespace-nowrap ${popoverConfig?.type === "EST" && popoverConfig?.taskId === task.id ? "bg-[#007BFF]/20 text-white" : "bg-transparent text-gray-400"}`}
                  >
                    {formatDecimalToTime(task.estimated_hours)}
                  </button>
                </div>

                {/* --- POPOVER BUTTON: LOGGED HOURS --- */}
                <div className="w-[60px] flex justify-center">
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const popHeight = 360; // Increased safely for buffer
                      let calculatedTop = rect.bottom + 6;

                      // BOUNDARY FIX: Enforce minimum top padding if flipped up
                      if (calculatedTop + popHeight > window.innerHeight) {
                        calculatedTop = rect.top - popHeight - 6;
                        if (calculatedTop < 10) calculatedTop = 10;
                      }

                      setPopoverConfig({
                        type: "LOG",
                        taskId: task.id,
                        task: task,
                        top: calculatedTop,
                        left: Math.max(10, rect.right - 280),
                      });

                      const todayStr = new Date().toISOString().split("T")[0];
                      const minD = task.start_date || "";
                      const maxD = task.task_date || task.deadline || "";
                      let defaultD = todayStr;
                      if (minD && todayStr < minD) defaultD = minD;
                      if (maxD && todayStr > maxD) defaultD = maxD;

                      setLogDate(defaultD);
                      setLogHours("");
                      setLogMinutes("");
                      setLogNote("");
                      setExistingEntryId(null);
                    }}
                    className={`w-full hover:bg-gray-700/50 text-center text-[11px] font-bold outline-none rounded transition-all py-0.5 cursor-pointer whitespace-nowrap ${popoverConfig?.type === "LOG" && popoverConfig?.taskId === task.id ? "bg-[#007BFF] text-white" : "bg-transparent text-[#007BFF]"}`}
                  >
                    {formatDecimalToTime(task.logged_hours)}
                  </button>
                </div>
              </div>
            ))}

            <div className="h-12 shrink-0 border-b border-gray-700/50 flex items-center bg-[#1D2125]">
              {quickCreateCol === "timeline" ? (
                <div className="flex items-center w-full px-4 gap-2 bg-[#2A2E33] h-full">
                  <input
                    autoFocus
                    type="text"
                    value={quickCreateTitle || ""}
                    onChange={(e) => setQuickCreateTitle?.(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleQuickCreateTask?.("To do");
                      if (e.key === "Escape") resetQuickCreate?.();
                    }}
                    placeholder="What needs to be done?"
                    className="w-full text-sm font-medium outline-none bg-transparent text-white placeholder-gray-400"
                    disabled={isCreating}
                  />
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={resetQuickCreate}
                      className="px-2 py-1 text-[10px] font-bold text-gray-400 hover:bg-gray-600 rounded transition-colors"
                    >
                      Esc
                    </button>
                    <button
                      onClick={() => handleQuickCreateTask?.("To do")}
                      disabled={isCreating}
                      className="px-2 py-1 text-[10px] font-bold bg-[#007BFF] text-white hover:bg-blue-600 rounded transition-colors"
                    >
                      {isCreating ? "..." : "↵"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setQuickCreateCol?.("timeline");
                    setQuickCreateTitle?.("");
                  }}
                  className="flex items-center px-4 gap-2 text-sm text-gray-500 font-medium hover:text-white hover:bg-[#2A2E33] transition-colors w-full h-full text-left"
                >
                  <PlusIcon className="w-5 h-5" /> Create
                </button>
              )}
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-auto relative [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-[#1D2125] [&::-webkit-scrollbar-corner]:bg-[#1D2125]"
        >
          {sortedTasks.length === 0 && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center justify-center p-6 bg-[#22272B] border border-gray-700 rounded-xl shadow-2xl text-center min-w-[300px]">
              <p className="text-gray-300 text-sm font-bold mb-1">
                No items found
              </p>
              <p className="text-gray-500 text-xs mb-4">
                There are no work items matching your current filters.
              </p>
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-[#007BFF] hover:text-blue-400 hover:underline transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}

          <div className="flex h-14 border-b border-gray-700 bg-[#22272B] sticky top-0 z-10 w-max">
            {days.map((day, i) => {
              const borderClass = day.isFirstOfYear
                ? "border-l-[3px] border-l-[#A855F7]/70"
                : day.isFirstOfMonth
                  ? "border-l-2 border-l-[#007BFF]/50"
                  : "border-r border-gray-700/30";
              return (
                <div
                  key={i}
                  className={`shrink-0 flex flex-col items-center justify-end pb-1 ${borderClass} ${day.isToday ? "bg-[#007BFF]/10" : ""}`}
                  style={{ width: `${dayWidth}px`, minWidth: `${dayWidth}px` }}
                >
                  {(day.isFirstOfMonth || i === 0) && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 whitespace-nowrap z-10">
                      {day.monthStr}{" "}
                      {day.isFirstOfYear && day.date.getFullYear()}
                    </span>
                  )}
                  {viewScale === "Weeks" && (
                    <div className="flex flex-col items-center leading-none gap-0.5">
                      <span
                        className={`text-[9px] font-medium uppercase ${day.isToday ? "text-[#007BFF]" : "text-gray-500"}`}
                      >
                        {day.dayNameStr}
                      </span>
                      <span
                        className={`text-xs font-bold ${day.isToday ? "text-[#007BFF] w-5 h-5 rounded-full bg-[#007BFF]/20 flex items-center justify-center" : "text-gray-400"}`}
                      >
                        {day.dayNum}
                      </span>
                    </div>
                  )}
                  {viewScale === "Months" && day.dayOfWeek === 1 && (
                    <span
                      className={`text-[9px] font-bold ${day.isToday ? "text-[#007BFF]" : "text-gray-500"}`}
                    >
                      {day.dayNum}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="relative w-max min-h-full">
            <div className="absolute inset-0 flex pointer-events-none">
              {days.map((day, i) => {
                const borderClass = day.isFirstOfYear
                  ? "border-l-[3px] border-l-[#A855F7]/30"
                  : day.isFirstOfMonth
                    ? "border-l-2 border-l-gray-500"
                    : "border-r border-gray-700/30";
                return (
                  <div
                    key={i}
                    className={`shrink-0 ${borderClass} ${day.isToday ? "bg-[#007BFF]/5" : ""}`}
                    style={{
                      width: `${dayWidth}px`,
                      minWidth: `${dayWidth}px`,
                    }}
                  ></div>
                );
              })}
            </div>

            {todayIndex !== -1 && (
              <div
                className="absolute top-0 bottom-0 w-px bg-[#007BFF] z-0 pointer-events-none shadow-[0_0_8px_#007BFF]"
                style={{ left: `${todayIndex * dayWidth + dayWidth / 2}px` }}
              ></div>
            )}

            <div className="relative z-10">
              {sortedTasks.map((task: any) => {
                const style = getTaskStyle(task);
                const est = task.estimated_hours || 0;
                const logged = task.logged_hours || 0;
                const isOverbudget = est > 0 && logged > est;
                const progressPct =
                  est > 0 ? Math.min((logged / est) * 100, 100) : 0;
                const baseColorClasses = isOverbudget
                  ? "bg-red-500/20 border-red-500/40"
                  : "bg-[#3B82F6]/20 border-[#3B82F6]/40";
                const fillColorClass = isOverbudget
                  ? "bg-red-500"
                  : "bg-[#3B82F6]";

                return (
                  <div
                    key={task.id}
                    className="h-10 border-b border-gray-700/30 relative hover:bg-white/2 transition-colors"
                  >
                    {style && !style.display && (
                      <div
                        title={`Est: ${formatDecimalToTime(est)} | Logged: ${formatDecimalToTime(logged)}`}
                        className={`absolute top-1.5 bottom-1.5 rounded shadow-sm border overflow-hidden group transition-all ${baseColorClasses}`}
                        style={style}
                      >
                        {est > 0 && (
                          <div
                            className={`absolute top-0 bottom-0 left-0 ${fillColorClass} transition-all duration-500 z-0`}
                            style={{ width: `${progressPct}%` }}
                          />
                        )}
                        <div className="relative z-10 flex items-center h-full px-2">
                          <span
                            className={`text-[11px] font-bold ${viewScale === "Years" ? "hidden" : "block"} text-white truncate drop-shadow-md group-hover:translate-x-1 transition-transform`}
                          >
                            {task.title}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="h-12 border-b border-gray-700/30"></div>
            </div>
          </div>
        </div>
      </div>

      {/* --- THE GLOBAL FLOATING POPOVER ROOT --- */}
      {popoverConfig && (
        <>
          <div
            className="fixed inset-0 z-100"
            onClick={() => setPopoverConfig(null)}
          ></div>
          <div
            className="fixed z-101 bg-[#282E33] border border-gray-600 rounded-lg shadow-2xl p-4 animate-in fade-in zoom-in-95 text-left cursor-default"
            style={{
              top: popoverConfig.top,
              left: popoverConfig.left,
              width: popoverConfig.type === "LOG" ? 280 : 240,
            }}
          >
            {popoverConfig.type === "EST" ? (
              <>
                <div className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-3">
                  Set Estimate
                </div>
                <div className="mb-4">
                  <label className="text-[10px] text-gray-400 mb-1 block">
                    Expected Duration
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center bg-[#1D2125] border border-gray-600 rounded focus-within:border-[#007BFF] overflow-hidden">
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        value={estHours}
                        onChange={(e) => setEstHours(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent text-sm text-white px-2 py-1.5 outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[11px] font-bold text-gray-500 pr-2">
                        h
                      </span>
                    </div>
                    <div className="flex-1 flex items-center bg-[#1D2125] border border-gray-600 rounded focus-within:border-[#007BFF] overflow-hidden">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={estMinutes}
                        onChange={(e) => setEstMinutes(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent text-sm text-white px-2 py-1.5 outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[11px] font-bold text-gray-500 pr-2">
                        m
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setPopoverConfig(null)}
                    className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEstTimeSubmit}
                    disabled={isSavingEst}
                    className="px-3 py-1.5 text-xs font-bold bg-[#007BFF] hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50"
                  >
                    {isSavingEst ? "Saving..." : "Save"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                    {existingEntryId ? "Edit Time Entry" : "Log Time"}
                  </div>
                  {isFetchingEntry && (
                    <span className="text-[10px] text-[#007BFF] font-medium animate-pulse">
                      Loading...
                    </span>
                  )}
                </div>

                <div className="mb-3">
                  <label className="text-[10px] text-gray-400 mb-1 block">
                    Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    min={popoverConfig.task.start_date || ""}
                    max={
                      popoverConfig.task.task_date ||
                      popoverConfig.task.deadline ||
                      ""
                    }
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full bg-[#1D2125] text-sm text-white outline-none border border-gray-600 rounded px-2 py-1.5 focus:border-[#007BFF] scheme:dark"
                  />
                </div>

                <div className="mb-3">
                  <label className="text-[10px] text-gray-400 mb-1 block">
                    Time Spent <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center bg-[#1D2125] border border-gray-600 rounded focus-within:border-[#007BFF] overflow-hidden">
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        value={logHours}
                        onChange={(e) => setLogHours(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent text-sm text-white px-2 py-1.5 outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[11px] font-bold text-gray-500 pr-2">
                        h
                      </span>
                    </div>
                    <div className="flex-1 flex items-center bg-[#1D2125] border border-gray-600 rounded focus-within:border-[#007BFF] overflow-hidden">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={logMinutes}
                        onChange={(e) => setLogMinutes(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent text-sm text-white px-2 py-1.5 outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[11px] font-bold text-gray-500 pr-2">
                        m
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-[10px] text-gray-400 mb-1 block">
                    Note / Description
                  </label>
                  <textarea
                    value={logNote}
                    onChange={(e) => setLogNote(e.target.value)}
                    placeholder="What did you work on?"
                    className="w-full bg-[#1D2125] text-sm text-white outline-none border border-gray-600 rounded px-2 py-1.5 focus:border-[#007BFF] resize-none h-16"
                  />
                </div>

                <div className="flex gap-2 justify-between">
                  {existingEntryId ? (
                    <button
                      onClick={handleDeleteEntry}
                      className="px-3 py-1.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                    >
                      Delete
                    </button>
                  ) : (
                    <div></div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setPopoverConfig(null)}
                      className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogTimeSubmit}
                      disabled={
                        isLoggingTime ||
                        isFetchingEntry ||
                        (!logHours && !logMinutes) ||
                        (parseInt(logHours || "0") === 0 &&
                          parseInt(logMinutes || "0") === 0) ||
                        !logDate
                      }
                      className="px-3 py-1.5 text-xs font-bold bg-[#007BFF] hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50"
                    >
                      {isLoggingTime
                        ? "Saving..."
                        : existingEntryId
                          ? "Update"
                          : "Save"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
