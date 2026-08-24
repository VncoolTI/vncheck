"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import { id as indonesiaLocale } from "date-fns/locale";
import {
  ChevronLeftIcon,
  PlusIcon,
  CheckCircleIcon,
  BugAntIcon,
  BookmarkIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  CodeBracketIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronDoubleUpIcon,
  ChevronDoubleDownIcon,
  Bars2Icon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

import ListView from "./_components/ListView";
import BoardView from "./_components/BoardView";
import { useKanbanStore } from "./_store/useKanbanStore";
import SummaryView from "./_components/SummaryView";
import TimelineView from "./_components/TimelineView";

export type WorkType = {
  id: string;
  name: string;
  description: string | null;
  icon_name: string;
  icon_color: string;
};

export type Task = {
  id: string | number;
  title: string;
  description: string | null;
  deadline: string;
  status: string;
  task_date?: string;
  work_type_id: string | null;
  work_types?: WorkType | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  priority?: string | null;
  parent_id?: string | null;
  subtasks?: Task[];
};

const DEFAULT_COLUMNS = ["To do", "In Progress", "In Review", "Done"];
const DEFAULT_TABS = [
  { id: "summary", label: "Summary" },
  { id: "list", label: "List" },
  { id: "board", label: "Board" },
  { id: "timeline", label: "Timeline" },
];

const ICON_MAP: Record<string, React.ElementType> = {
  check: CheckCircleIcon,
  bug: BugAntIcon,
  bookmark: BookmarkIcon,
  bolt: BoltIcon,
  warning: ExclamationTriangleIcon,
  code: CodeBracketIcon,
};

export default function EmployeeKanbanPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Me");
  const [userRole, setUserRole] = useState<string>("admin");
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [columnsData, setColumnsData] = useState<Record<string, Task[]>>({
    "To do": [],
    "In Progress": [],
    "In Review": [],
    Done: [],
  });
  const [listTasks, setListTasks] = useState<Task[]>([]);

  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWtName, setNewWtName] = useState("");
  const [newWtDesc, setNewWtDesc] = useState("");
  const [newWtIcon, setNewWtIcon] = useState("check");
  const [newWtColor, setNewWtColor] = useState("#3B82F6");
  const [isSavingWt, setIsSavingWt] = useState(false);

  const {
    currentView,
    setCurrentView,
    columnsOrder,
    setColumnsOrder,
    tabsOrder,
    setTabsOrder,
    taskOrder,
    setTaskOrder,
    listColumns,
    setListColumns,
  } = useKanbanStore();

  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [quickCreateCol, setQuickCreateCol] = useState<string | null>(null);
  const [quickCreateTitle, setQuickCreateTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(e.target as Node)
      ) {
        setShowAvatarMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Notification badge — kept in sync with dashboard
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    let channel: any;
    const fetchUnreadCount = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (count !== null) setUnreadCount(count);
      channel = supabase
        .channel("task-page-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => fetchUnreadCount(),
        )
        .subscribe();
    };
    fetchUnreadCount();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    const initData = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) return router.push("/");

      const { data: employeeData } = await supabase
        .from("employees")
        .select("*")
        .eq("id", user.id)
        .single();
      if (employeeData) {
        setAvatarUrl(employeeData.avatar_url);
        setUserName(employeeData.name || employeeData.full_name || "Me");
        setUserRole(employeeData.role || "admin");

        if (employeeData.preferences) {
          if (employeeData.preferences.columnsOrder)
            setColumnsOrder(employeeData.preferences.columnsOrder);
          if (employeeData.preferences.tabsOrder) {
            let savedTabs = employeeData.preferences.tabsOrder;
            const missingTabs = DEFAULT_TABS.filter(
              (defaultTab) =>
                !savedTabs.some((saved: any) => saved.id === defaultTab.id),
            );
            savedTabs = savedTabs.filter((saved: any) =>
              DEFAULT_TABS.some((defaultTab) => defaultTab.id === saved.id),
            );
            setTabsOrder([...savedTabs, ...missingTabs]);
          }
          if (employeeData.preferences.currentView)
            setCurrentView(employeeData.preferences.currentView);
          if (employeeData.preferences.taskOrder)
            setTaskOrder(employeeData.preferences.taskOrder);
          if (employeeData.preferences.listColumns)
            setListColumns(employeeData.preferences.listColumns);
        }
      }

      const { data: allEmployees } = await supabase
        .from("employees")
        .select("*")
        .order("full_name", { ascending: true });
      if (allEmployees) setEmployeesList(allEmployees);

      fetchWorkTypes();
      setUser(user);
    };
    initData();
  }, [router, supabase]);

  const fetchWorkTypes = async () => {
    const { data } = await supabase
      .from("work_types")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setWorkTypes(data);
  };

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query;

    // --- ROLE-BASED ACCESS LOGIC ---
    if (userRole === "admin" || userRole === "super_admin") {
      // ADMIN/SUPER_ADMIN VIEW: Fetch absolutely everything.
      query = supabase
        .from("tasks")
        .select(
          "*, task_assignees(employee_id), work_types(id, name, icon_name, icon_color)",
        )
        .neq("status", "Cancelled")
        .order("task_date", { ascending: true });
    } else {
      // EMPLOYEE VIEW: Only fetch tasks explicitly assigned to them.
      query = supabase
        .from("tasks")
        .select(
          "*, task_assignees!inner(employee_id), work_types(id, name, icon_name, icon_color)",
        )
        .eq("task_assignees.employee_id", user.id)
        .neq("status", "Cancelled")
        .order("task_date", { ascending: true });
    }

    const { data, error } = await query;

    if (!error && data) {
      const allTasks = data as Task[];
      const mainTasks = allTasks.filter((t) => !t.parent_id);
      const subTasks = allTasks.filter((t) => t.parent_id);

      mainTasks.forEach(
        (mt) => (mt.subtasks = subTasks.filter((st) => st.parent_id === mt.id)),
      );
      setListTasks(mainTasks);

      const grouped: Record<string, Task[]> = {
        "To do": [],
        "In Progress": [],
        "In Review": [],
        Done: [],
      };
      mainTasks.forEach((item) => {
        const status = DEFAULT_COLUMNS.includes(item.status)
          ? item.status
          : "To do";
        grouped[status].push({ ...item, deadline: item.task_date ?? "" });
      });

      // RE-SORT BASED ON SAVED DRAG-AND-DROP ORDER
      const currentTaskOrder = useKanbanStore.getState().taskOrder || {};
      Object.keys(grouped).forEach((col) => {
        const savedOrder = currentTaskOrder[col];
        if (savedOrder && savedOrder.length > 0) {
          grouped[col].sort((a, b) => {
            const indexA = savedOrder.indexOf(String(a.id));
            const indexB = savedOrder.indexOf(String(b.id));

            const valA = indexA === -1 ? -1 : indexA;
            const valB = indexB === -1 ? -1 : indexB;

            if (valA === -1 && valB === -1) return 0;
            return valA - valB;
          });
        }
      });
      setColumnsData(grouped);
    }
    setLoading(false);
  }, [user, userRole, supabase]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAssignWorkType = async (
    taskId: string | number,
    workTypeId: string,
  ) => {
    setOpenDropdownId(null);
    const newCols = { ...columnsData };
    let taskToUpdate: Task | null = null;
    Object.keys(newCols).forEach((col) => {
      const t = newCols[col].find((t) => String(t.id) === String(taskId));
      if (t) {
        t.work_type_id = workTypeId;
        t.work_types = workTypes.find((w) => w.id === workTypeId) || null;
        taskToUpdate = t;
      }
    });
    setColumnsData(newCols);

    setListTasks((prev) =>
      prev.map((t) =>
        String(t.id) === String(taskId)
          ? {
              ...t,
              work_type_id: workTypeId,
              work_types: workTypes.find((w) => w.id === workTypeId) || null,
            }
          : t,
      ),
    );

    if (taskToUpdate)
      await supabase
        .from("tasks")
        .update({ work_type_id: workTypeId })
        .eq("id", taskId);
  };

  const handleCreateWorkType = async () => {
    if (!newWtName.trim()) return;
    setIsSavingWt(true);
    const { data, error } = await supabase
      .from("work_types")
      .insert({
        name: newWtName,
        description: newWtDesc,
        icon_name: newWtIcon,
        icon_color: newWtColor,
      })
      .select()
      .single();
    if (!error && data) {
      setWorkTypes([...workTypes, data]);
      setIsModalOpen(false);
      setNewWtName("");
      setNewWtDesc("");
    } else alert("Failed to create work type.");
    setIsSavingWt(false);
  };

  const resetQuickCreate = () => {
    setQuickCreateCol(null);
    setQuickCreateTitle("");
  };

  const handleQuickCreateTask = async (columnId: string) => {
    if (!quickCreateTitle.trim()) return resetQuickCreate();
    setIsCreating(true);
    const todayStr = format(new Date(), "yyyy-MM-dd");

    try {
      const { data: newTask, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: quickCreateTitle,
          status: columnId,
          task_date: todayStr,
          start_date: todayStr,
          project: "-",
          work_type_id: null,
          user_id: user.id,
          assignee_id: user.id,
          assignee_name: userName,
        })
        .select()
        .single();
      if (taskError) throw taskError;
      await supabase
        .from("task_assignees")
        .insert({ task_id: newTask.id, employee_id: user.id });
      resetQuickCreate();
      await fetchTasks();
    } catch (error: any) {
      alert(`Failed: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewChange = async (viewId: "board" | "list" | "timeline") => {
    setCurrentView(viewId);

    if (user) {
      await supabase
        .from("employees")
        .update({
          preferences: {
            columnsOrder: columnsOrder,
            tabsOrder: tabsOrder,
            currentView: viewId,
          },
        })
        .eq("id", user.id);
    }
  };

  const handleUpdateListColumns = async (newCols: any[]) => {
    setListColumns(newCols); // Update screen instantly
    if (user) {
      const { data: employeeData } = await supabase
        .from("employees")
        .select("preferences")
        .eq("id", user.id)
        .single();
      const currentPrefs = employeeData?.preferences || {};
      await supabase
        .from("employees")
        .update({
          preferences: { ...currentPrefs, listColumns: newCols },
        })
        .eq("id", user.id);
    }
  };

  const handleGlobalDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;

    if (type === "TAB") {
      const newTabs = Array.from(tabsOrder);
      const [movedTab] = newTabs.splice(source.index, 1);
      newTabs.splice(destination.index, 0, movedTab);
      setTabsOrder(newTabs);
      await supabase
        .from("employees")
        .update({
          preferences: { columnsOrder: columnsOrder, tabsOrder: newTabs },
        })
        .eq("id", user.id);
      return;
    }

    if (type === "COLUMN") {
      const newOrder = Array.from(columnsOrder);
      const [movedCol] = newOrder.splice(source.index, 1);
      newOrder.splice(destination.index, 0, movedCol);
      setColumnsOrder(newOrder);
      await supabase
        .from("employees")
        .update({
          preferences: { columnsOrder: newOrder, tabsOrder: tabsOrder },
        })
        .eq("id", user.id);
      return;
    }

    if (type === "LIST_COLUMN") {
      const newCols = Array.from(listColumns);
      const [movedCol] = newCols.splice(source.index, 1);
      newCols.splice(destination.index, 0, movedCol);
      handleUpdateListColumns(newCols);
      return;
    }

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;
    const newColumnsData = { ...columnsData };

    if (sourceCol === destCol) {
      const tasks = Array.from(newColumnsData[sourceCol]);
      const [movedTask] = tasks.splice(source.index, 1);
      tasks.splice(destination.index, 0, movedTask);
      newColumnsData[sourceCol] = tasks;
    } else {
      const sourceTasks = Array.from(newColumnsData[sourceCol]);
      const destTasks = Array.from(newColumnsData[destCol]);
      const [movedTask] = sourceTasks.splice(source.index, 1);
      movedTask.status = destCol;
      destTasks.splice(destination.index, 0, movedTask);
      newColumnsData[sourceCol] = sourceTasks;
      newColumnsData[destCol] = destTasks;
    }

    setColumnsData(newColumnsData);
    setListTasks((prev) =>
      prev.map((t) =>
        String(t.id) === String(draggableId) ? { ...t, status: destCol } : t,
      ),
    );

    const currentTaskOrder = useKanbanStore.getState().taskOrder || {};
    const newTaskOrder = { ...currentTaskOrder };

    if (sourceCol === destCol) {
      newTaskOrder[sourceCol] = newColumnsData[sourceCol].map((t) =>
        String(t.id),
      );
    } else {
      newTaskOrder[sourceCol] = newColumnsData[sourceCol].map((t) =>
        String(t.id),
      );
      newTaskOrder[destCol] = newColumnsData[destCol].map((t) => String(t.id));
    }

    setTaskOrder(newTaskOrder);

    const { data: employeeData } = await supabase
      .from("employees")
      .select("preferences")
      .eq("id", user.id)
      .single();
    const currentPrefs = employeeData?.preferences || {};

    await supabase
      .from("employees")
      .update({
        preferences: { ...currentPrefs, taskOrder: newTaskOrder },
      })
      .eq("id", user.id);

    if (sourceCol !== destCol) {
      await supabase
        .from("tasks")
        .update({ status: destCol })
        .eq("id", draggableId);
    }
  };

  const handleSaveTaskDetails = async (updatedTask: any) => {
    try {
      const isMe =
        updatedTask.assignee_name?.trim().toLowerCase() ===
        userName.trim().toLowerCase();
      const finalAssigneeId = isMe ? user.id : updatedTask.assignee_id;
      const { error } = await supabase
        .from("tasks")
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          task_date: updatedTask.task_date,
          start_date: updatedTask.start_date,
          project: updatedTask.project,
          division: updatedTask.division,
          assignee_name: updatedTask.assignee_name,
          assignee_id: finalAssigneeId,
          priority: updatedTask.priority,
          status: updatedTask.status,
          estimated_hours: updatedTask.estimated_hours,
          logged_hours: updatedTask.logged_hours,
        })
        .eq("id", updatedTask.id);
      if (error) throw error;
      setEditingTask(null);
      await fetchTasks();
    } catch (err: any) {
      alert("Failed to save task: " + err.message);
    }
  };

  const handleDeleteTask = async (taskId: string | number) => {
    if (
      !confirm(
        "Are you sure you want to delete this task? This action cannot be undone.",
      )
    )
      return;
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
      setEditingTask(null);
      await fetchTasks();
    } catch (err: any) {
      alert("Failed to delete task: " + err.message);
    }
  };

  const formatDeadline = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy", {
        locale: indonesiaLocale,
      });
    } catch (e) {
      return dateStr || "-";
    }
  };

  const renderWorkTypeIcon = (
    wt: WorkType | null | undefined,
    className: string = "w-4 h-4",
  ) => {
    if (!wt)
      return <CheckCircleIcon className={`${className} text-[#3B82F6]`} />;
    const IconComponent = ICON_MAP[wt.icon_name] || CheckCircleIcon;
    return (
      <IconComponent className={className} style={{ color: wt.icon_color }} />
    );
  };

  const renderPriorityIcon = (priority: string | null | undefined) => {
    switch (priority) {
      case "Highest":
        return (
          <ChevronDoubleUpIcon className="w-4 h-4 text-red-500 stroke-3" />
        );
      case "High":
        return <ChevronUpIcon className="w-4 h-4 text-red-500 stroke-3" />;
      case "Low":
        return <ChevronDownIcon className="w-4 h-4 text-blue-500 stroke-3" />;
      case "Lowest":
        return (
          <ChevronDoubleDownIcon className="w-4 h-4 text-blue-500 stroke-3" />
        );
      default:
        return <Bars2Icon className="w-4 h-4 text-orange-500 stroke-3" />;
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "Me";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const renderActiveView = () => {
    switch (currentView) {
      case "summary":
        return (
          <SummaryView listTasks={listTasks} user={user} userName={userName} />
        );
      case "board":
        return (
          <BoardView
            columnsOrder={columnsOrder}
            columnsData={columnsData}
            setEditingTask={setEditingTask}
            formatDeadline={formatDeadline}
            openDropdownId={openDropdownId}
            setOpenDropdownId={setOpenDropdownId}
            renderWorkTypeIcon={renderWorkTypeIcon}
            handleAssignWorkType={handleAssignWorkType}
            workTypes={workTypes}
            setIsModalOpen={setIsModalOpen}
            renderPriorityIcon={renderPriorityIcon}
            avatarUrl={avatarUrl}
            user={user}
            getInitials={getInitials}
            quickCreateCol={quickCreateCol}
            setQuickCreateCol={setQuickCreateCol}
            quickCreateTitle={quickCreateTitle}
            setQuickCreateTitle={setQuickCreateTitle}
            handleQuickCreateTask={handleQuickCreateTask}
            resetQuickCreate={resetQuickCreate}
            isCreating={isCreating}
          />
        );
      case "list":
        return (
          <ListView
            listTasks={listTasks}
            setEditingTask={setEditingTask}
            user={user}
            avatarUrl={avatarUrl}
            getInitials={getInitials}
            renderPriorityIcon={renderPriorityIcon}
            formatDeadline={formatDeadline}
            quickCreateCol={quickCreateCol}
            setQuickCreateCol={setQuickCreateCol}
            quickCreateTitle={quickCreateTitle}
            setQuickCreateTitle={setQuickCreateTitle}
            handleQuickCreateTask={handleQuickCreateTask}
            resetQuickCreate={resetQuickCreate}
            isCreating={isCreating}
            listColumns={listColumns}
            onUpdateColumns={handleUpdateListColumns}
          />
        );
      case "timeline":
        return (
          <TimelineView
            listTasks={listTasks}
            setEditingTask={setEditingTask}
            quickCreateCol={quickCreateCol}
            setQuickCreateCol={setQuickCreateCol}
            quickCreateTitle={quickCreateTitle}
            setQuickCreateTitle={setQuickCreateTitle}
            handleQuickCreateTask={handleQuickCreateTask}
            resetQuickCreate={resetQuickCreate}
            isCreating={isCreating}
            handleSaveTaskDetails={handleSaveTaskDetails}
          />
        );
      default:
        return <div className="p-4 text-white">View not found</div>;
    }
  };

  return (
    <DragDropContext onDragEnd={handleGlobalDragEnd}>
      <div className="min-h-screen flex flex-col  bg-vn-primary dark:bg-[#001436]">
        <div className="bg-vn-primary px-6 dark:bg-[#001436] flex justify-between items-center sticky top-0 z-20 shadow-sm transition-colors duration-200 h-24">
          {/* Back button — mobile only */}
          <button
            onClick={() => router.back()}
            className="flex md:hidden items-center text-white hover:text-blue-200 transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5 mr-1" />
            <span className="font-medium">Back</span>
          </button>

          <span className="hidden md:block font-bold text-white text-lg tracking-wide">
            My Tasks
          </span>

          <div className="flex items-center gap-3">
            <Link href="/employee/notification" className="relative">
              <BellIcon className="w-6 h-6 text-white hover:text-yellow-300 transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-sm border border-vn-primary dark:border-[#001436]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            {/* Avatar with dropdown */}
            <div ref={avatarMenuRef} className="relative">
              <button
                onClick={() => setShowAvatarMenu((v) => !v)}
                className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shadow-sm relative border-2 border-white/30 hover:ring-2 hover:ring-white/50 transition-all focus:outline-none"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <UserCircleIcon className="w-full h-full text-gray-400" />
                )}
              </button>

              {showAvatarMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1D2125] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {userName}
                    </p>
                    <p className="text-xs text-gray-400 capitalize truncate">
                      {userRole}
                    </p>
                  </div>
                  <div className="py-1.5">
                    <Link
                      href="/employee/profile"
                      onClick={() => setShowAvatarMenu(false)}
                    >
                      <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                        <UserCircleIcon className="w-4 h-4 text-gray-400" />
                        View Profile
                      </div>
                    </Link>
                    <Link
                      href="/employee/settings"
                      onClick={() => setShowAvatarMenu(false)}
                    >
                      <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                        <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
                        Settings
                      </div>
                    </Link>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-700 py-1.5">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gradient content area — tabs + view */}
        <div className="flex-1 flex flex-col bg-linear-to-b from-[#478FFC] to-[#83E2F7] dark:from-[#001B48] dark:to-[#3B7CDE] text-gray-800 relative pb-24">
          {/* Tabs Layer */}
          <div className="relative border-b border-gray-200 dark:border-white/10 z-10">
            <div className="absolute inset-0 bg-white/50 dark:bg-[#001436]/50 backdrop-blur-md pointer-events-none"></div>

            <Droppable
              droppableId="main-tabs"
              direction="horizontal"
              type="TAB"
            >
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="px-4 py-2 flex items-center relative z-10"
                >
                  {tabsOrder.map((tab, index) => (
                    <Draggable key={tab.id} draggableId={tab.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={provided.draggableProps.style}
                          className="pr-4"
                        >
                          <div
                            onClick={() => handleViewChange(tab.id as any)}
                            className={`cursor-pointer select-none px-3 py-2 text-sm font-bold border-b-2 transition-colors ${
                              currentView === tab.id
                                ? "border-[#007BFF] text-[#007BFF]"
                                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            } ${snapshot.isDragging ? "opacity-70 shadow-lg bg-white/80 dark:bg-[#001436] rounded-t-md border-b-transparent" : ""}`}
                          >
                            {tab.label}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 ml-2 mr-4"></div>
                  <button
                    onClick={() => alert("Add View feature coming soon!")}
                    className="p-1.5 text-gray-500 hover:text-[#007BFF] hover:bg-blue-50 dark:hover:bg-[#007BFF]/10 rounded transition-colors flex items-center gap-1 text-sm font-bold"
                  >
                    <PlusIcon className="w-5 h-5" /> View
                  </button>
                </div>
              )}
            </Droppable>
          </div>

          {/* Main View Area */}
          <div className="flex-1 p-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {loading && !isCreating ? (
              <div className="flex justify-center py-20">
                <span className="loading loading-spinner text-white loading-md"></span>
              </div>
            ) : (
              renderActiveView()
            )}
          </div>
        </div>
        {/* end gradient content area */}

        {/* Modals & Overlays */}
        {openDropdownId && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenDropdownId(null)}
          ></div>
        )}

        {editingTask && (
          <TaskDetailsModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onSave={handleSaveTaskDetails}
            onDelete={handleDeleteTask}
            currentUser={user}
            currentUserName={userName}
            employeesList={employeesList}
            userRole={userRole}
          />
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#22272B] w-full max-w-md rounded-xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-5 border-b border-gray-700/50">
                <h2 className="text-xl font-bold text-gray-100">
                  Add work type
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-1">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newWtName}
                    onChange={(e) => setNewWtName(e.target.value)}
                    className="w-full bg-[#1D2125] text-white border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="e.g. Hotfix, Design"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newWtDesc}
                    onChange={(e) => setNewWtDesc(e.target.value)}
                    className="w-full bg-[#1D2125] text-white border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none h-20"
                    placeholder="Let people know when to use this work type."
                  />
                </div>
              </div>
              <div className="p-4 border-t border-gray-700/50 flex justify-end">
                <button
                  onClick={handleCreateWorkType}
                  disabled={!newWtName.trim() || isSavingWt}
                  className="bg-[#007BFF] hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {isSavingWt ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}
