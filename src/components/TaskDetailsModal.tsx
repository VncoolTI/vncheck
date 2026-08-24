"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  XMarkIcon,
  DocumentTextIcon,
  UserCircleIcon,
  HashtagIcon,
  BriefcaseIcon,
  ChevronUpIcon,
  ChevronDoubleUpIcon,
  ChevronDownIcon,
  ChevronDoubleDownIcon,
  Bars2Icon,
  PlusIcon,
  EllipsisHorizontalIcon,
  QueueListIcon,
  LockClosedIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const PRIORITY_OPTIONS = [
  { name: "Highest", icon: ChevronDoubleUpIcon, color: "text-red-500" },
  { name: "High", icon: ChevronUpIcon, color: "text-red-500" },
  { name: "Medium", icon: Bars2Icon, color: "text-orange-500" },
  { name: "Low", icon: ChevronDownIcon, color: "text-blue-500" },
  { name: "Lowest", icon: ChevronDoubleDownIcon, color: "text-blue-500" },
];

export default function TaskDetailsModal({
  task,
  onClose,
  onSave,
  onDelete,
  currentUser,
  currentUserName,
  employeesList = [],
  userRole = "admin",
}: {
  task: any;
  onClose: () => void;
  onSave: (updatedTask: any) => void;
  onDelete: (taskId: string | number) => void;
  currentUser: any;
  currentUserName: string;
  employeesList: any[];
  userRole: string;
}) {
  const supabase = createClient();

  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState(task.task_date || task.deadline || "");
  const [startDate, setStartDate] = useState(task.start_date || "");
  const [project, setProject] = useState(task.project || "");
  const [division, setDivision] = useState(task.division || "");
  const [priority, setPriority] = useState(task.priority || "Medium");
  const [status, setStatus] = useState(task.status || "To do");
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const [assigneeId, setAssigneeId] = useState<string | null>(
    task.assignee_id || null,
  );
  const [assigneeName, setAssigneeName] = useState(
    task.assignee_name || "Unassigned",
  );

  // --- SUBTASK STATE ---
  const [localSubtasks, setLocalSubtasks] = useState<any[]>(
    task.subtasks || [],
  );
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEditAssignee = userRole === "admin" || userRole === "super_admin";

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({
      ...task,
      title,
      description,
      task_date: dueDate,
      start_date: startDate,
      project,
      division,
      assignee_id: assigneeId,
      assignee_name: assigneeName,
      priority: priority,
      status: status,
    });
    setIsSaving(false);
  };

  // --- SUBTASK LOGIC ---
  const handleCreateSubtask = async () => {
    if (!newSubtaskTitle.trim()) {
      setIsAddingSubtask(false);
      return;
    }

    // Save to database immediately
    const { data: newDbTask, error } = await supabase
      .from("tasks")
      .insert({
        title: newSubtaskTitle,
        status: "To do",
        parent_id: task.id,
        project: project,
        division: division,
        assignee_id: currentUser.id,
        assignee_name: currentUserName,
        priority: "Medium",
        user_id: currentUser.id,
      })
      .select()
      .single();

    if (error) {
      alert("Failed to create subtask: " + error.message);
      console.error(error);
    } else if (newDbTask) {
      await supabase
        .from("task_assignees")
        .insert({ task_id: newDbTask.id, employee_id: currentUser.id });
      setLocalSubtasks([...localSubtasks, newDbTask]);
    }

    setNewSubtaskTitle("");
    setIsAddingSubtask(false);
  };

  const handleUpdateSubtaskStatus = async (
    subtaskId: string | number,
    newStatus: string,
  ) => {
    // Optimistic UI Update
    setLocalSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, status: newStatus } : s)),
    );
    // Database Update
    await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", subtaskId);
  };

  const handleUpdateSubtaskPriority = async (
    subtaskId: string | number,
    newPriority: string,
  ) => {
    // 1. Instantly update the UI
    setLocalSubtasks((prev) =>
      prev.map((s) =>
        s.id === subtaskId ? { ...s, priority: newPriority } : s,
      ),
    );
    // 2. Save to database
    await supabase
      .from("tasks")
      .update({ priority: newPriority })
      .eq("id", subtaskId);
  };

  const handleUpdateSubtaskAssignee = async (
    subtaskId: string | number,
    newAssigneeId: string,
  ) => {
    // Look up the selected employee's name
    const emp = employeesList.find((e) => e.id === newAssigneeId);
    const empName = emp ? emp.name || emp.full_name || "Unknown" : "Unassigned";
    const finalAssigneeId =
      newAssigneeId === "unassigned" ? null : newAssigneeId;

    // 1. Instantly update the UI
    setLocalSubtasks((prev) =>
      prev.map((s) =>
        s.id === subtaskId
          ? {
              ...s,
              assignee_id: finalAssigneeId,
              assignee_name: empName,
            }
          : s,
      ),
    );

    // 2. Save to database
    await supabase
      .from("tasks")
      .update({
        assignee_id: finalAssigneeId,
        assignee_name: empName,
      })
      .eq("id", subtaskId);
  };

  // --- PROGRESS BAR MATH ---
  const totalSubtasks = localSubtasks.length;
  const completedSubtasks = localSubtasks.filter(
    (s) => s.status === "Done",
  ).length;
  const progressPercent =
    totalSubtasks === 0
      ? 0
      : Math.round((completedSubtasks / totalSubtasks) * 100);

  // --- HELPERS ---
  const getPriorityData = (priorityName: string) =>
    PRIORITY_OPTIONS.find((p) => p.name === priorityName) ||
    PRIORITY_OPTIONS[2];
  const CurrentPriorityIcon = getPriorityData(priority).icon;
  const currentPriorityColor = getPriorityData(priority).color;

  const getInitials = (name?: string | null) => {
    if (!name || name === "Unassigned") return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const currentAssigneeData = employeesList.find(
    (emp) => emp.id === assigneeId,
  );
  const displayAvatar = currentAssigneeData?.avatar_url;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
      {/* Invisible overlay to close custom dropdowns */}
      {(isPriorityOpen || isAssigneeOpen || isStatusOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsPriorityOpen(false);
            setIsAssigneeOpen(false);
            setIsStatusOpen(false);
          }}
        ></div>
      )}

      <div className="bg-[#1D2125] w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col relative z-50 transform-gpu">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700/50 bg-[#22272B] shrink-0">
          <div className="flex items-center gap-3 text-gray-400 text-sm font-medium">
            <span className="flex items-center gap-2 hover:bg-gray-800 px-2 py-1 rounded cursor-pointer transition-colors">
              Task ID: VK-{task.id}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* --- NEW DELETE BUTTON --- */}
            <button
              onClick={async () => {
                setIsDeleting(true);
                await onDelete(task.id);
              }}
              disabled={isDeleting || isSaving}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-red-600 rounded transition-colors disabled:opacity-50"
              title="Delete Task"
            >
              <TrashIcon className="w-5 h-5" />
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              className="bg-[#007BFF] hover:bg-blue-600 text-white text-sm font-bold py-1.5 px-4 rounded transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col md:flex-row relative">
          <div className="flex-1 p-6 md:pr-8 md:border-r border-gray-700/50">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-2xl font-bold text-gray-100 outline-none border border-transparent hover:border-gray-600 focus:border-blue-500 rounded px-2 py-1 -ml-2 mb-6 transition-colors"
            />

            <div className="mb-10">
              <h3 className="text-gray-100 font-bold mb-3 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-gray-400" />{" "}
                Description
              </h3>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                className="w-full bg-[#22272B] hover:bg-[#2C333A] focus:bg-[#22272B] text-gray-300 border border-gray-700 rounded-lg px-4 py-3 min-h-[150px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-y"
              />
            </div>

            {/* --- ACTIVE SUBTASKS SECTION --- */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-100 font-bold flex items-center gap-2">
                  <QueueListIcon className="w-5 h-5 text-gray-400" /> Subtasks
                </h3>
                <div className="flex items-center gap-1 text-gray-400">
                  <button
                    onClick={() => setIsAddingSubtask(true)}
                    className="p-1 hover:bg-gray-700 hover:text-gray-200 rounded transition-colors"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium text-gray-400 w-12 text-right">
                  {progressPercent}% Done
                </span>
              </div>

              {/* Subtasks Table */}
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-[#22272B] border-b border-gray-700 text-xs font-semibold text-gray-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">Work</th>
                      <th className="px-4 py-2 font-medium w-24">Priority</th>
                      <th className="px-4 py-2 font-medium w-32">Assignee</th>
                      <th className="px-4 py-2 font-medium w-32">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {localSubtasks.length === 0 && !isAddingSubtask && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-6 text-center text-gray-500"
                        >
                          No subtasks yet. Click the + to break this task down.
                        </td>
                      </tr>
                    )}

                    {localSubtasks.map((subtask) => {
                      const SubIcon = getPriorityData(
                        subtask.priority || "Medium",
                      ).icon;
                      const SubColor = getPriorityData(
                        subtask.priority || "Medium",
                      ).color;

                      return (
                        <tr
                          key={subtask.id}
                          className="hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 whitespace-nowrap text-xs">
                                VK-{subtask.id}
                              </span>
                              <span
                                className={`font-medium line-clamp-1 ${subtask.status === "Done" ? "line-through text-gray-500" : "text-gray-200"}`}
                              >
                                {subtask.title}
                              </span>
                            </div>
                          </td>
                          {/* --- EDITABLE PRIORITY CELL --- */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <SubIcon
                                className={`w-4 h-4 ${SubColor} shrink-0`}
                              />
                              <select
                                value={subtask.priority || "Medium"}
                                onChange={(e) =>
                                  handleUpdateSubtaskPriority(
                                    subtask.id,
                                    e.target.value,
                                  )
                                }
                                className="bg-transparent hover:bg-gray-700 text-gray-200 text-xs px-1 py-1 rounded cursor-pointer outline-none transition-colors"
                              >
                                {PRIORITY_OPTIONS.map((opt) => (
                                  <option
                                    key={opt.name}
                                    value={opt.name}
                                    className="bg-gray-800"
                                  >
                                    {opt.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          {/* --- EDITABLE ASSIGNEE CELL --- */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {/* Avatar display logic for subtask row */}
                              <div className="w-5 h-5 rounded-full bg-[#F59E0B] flex items-center justify-center text-[9px] font-bold text-white shrink-0 overflow-hidden">
                                {(() => {
                                  const subAssigneeData = employeesList.find(
                                    (emp) => emp.id === subtask.assignee_id,
                                  );
                                  return subAssigneeData?.avatar_url ? (
                                    <img
                                      src={subAssigneeData.avatar_url}
                                      alt=""
                                      className="object-cover w-full h-full"
                                    />
                                  ) : (
                                    getInitials(subtask.assignee_name)
                                  );
                                })()}
                              </div>

                              {/* Native Dropdown for picking Assignee */}
                              <select
                                value={subtask.assignee_id || "unassigned"}
                                onChange={(e) =>
                                  handleUpdateSubtaskAssignee(
                                    subtask.id,
                                    e.target.value,
                                  )
                                }
                                disabled={!canEditAssignee}
                                className={`bg-transparent text-gray-200 text-xs px-1 py-1 rounded outline-none w-24 truncate transition-colors ${canEditAssignee ? "hover:bg-gray-700 cursor-pointer" : "cursor-not-allowed opacity-70"}`}
                              >
                                <option
                                  value="unassigned"
                                  className="bg-gray-800"
                                >
                                  Unassigned
                                </option>
                                {employeesList.map((emp) => (
                                  <option
                                    key={emp.id}
                                    value={emp.id}
                                    className="bg-gray-800"
                                  >
                                    {emp.name || emp.full_name || "Unknown"}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={subtask.status}
                              onChange={(e) =>
                                handleUpdateSubtaskStatus(
                                  subtask.id,
                                  e.target.value,
                                )
                              }
                              className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold px-2 py-1.5 rounded cursor-pointer outline-none w-full"
                            >
                              <option value="To do">TO DO</option>
                              <option value="In Progress">IN PROGRESS</option>
                              <option value="In Review">IN REVIEW</option>
                              <option value="Done">DONE</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Inline Create Input */}
                    {isAddingSubtask && (
                      <tr className="bg-[#22272B]">
                        <td colSpan={4} className="px-4 py-2">
                          <input
                            autoFocus
                            type="text"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCreateSubtask();
                              if (e.key === "Escape") setIsAddingSubtask(false);
                            }}
                            onBlur={() => {
                              if (newSubtaskTitle) handleCreateSubtask();
                              else setIsAddingSubtask(false);
                            }}
                            placeholder="What needs to be done?"
                            className="w-full bg-transparent text-sm text-white outline-none border border-blue-500 rounded px-2 py-1.5"
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="w-full md:w-[350px] p-6 bg-[#22272B]">
            <div className="mb-6 relative z-50">
              <button
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold py-1.5 px-3 rounded inline-flex items-center gap-2 transition-colors"
              >
                {status} <ChevronDownIcon className="w-4 h-4" />
              </button>

              {isStatusOpen && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-[#282E33] border border-gray-600 rounded-md shadow-xl overflow-hidden py-1">
                  {["To do", "In Progress", "In Review", "Done"].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setStatus(s);
                        setIsStatusOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-[#1D2125] px-4 py-2 border-b border-gray-700 font-bold text-gray-300 text-sm">
                Details
              </div>

              <div className="p-4 flex flex-col gap-4 text-sm">
                <div className="flex items-center justify-between relative group">
                  <span className="text-gray-400 font-medium w-24">
                    Assignee
                  </span>
                  <div className="flex-1 relative">
                    <button
                      onClick={() =>
                        canEditAssignee && setIsAssigneeOpen(!isAssigneeOpen)
                      }
                      className={`w-full flex items-center justify-between text-gray-200 bg-transparent border border-transparent rounded px-2 py-1 -ml-2 transition-colors ${canEditAssignee ? "hover:bg-gray-700 hover:border-gray-600 cursor-pointer" : "cursor-default"}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#F59E0B] flex items-center justify-center text-white text-[9px] font-bold shadow-sm overflow-hidden shrink-0">
                          {displayAvatar ? (
                            <img
                              src={displayAvatar}
                              alt="Assignee"
                              loading="lazy"
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            getInitials(assigneeName)
                          )}
                        </div>
                        <span className="truncate max-w-[120px] text-left">
                          {assigneeName}
                        </span>
                      </div>

                      {canEditAssignee ? (
                        <ChevronDownIcon className="w-3 h-3 text-gray-400" />
                      ) : (
                        <LockClosedIcon
                          className="w-3 h-3 text-gray-600"
                          title="Only Admins can change assignees"
                        />
                      )}
                    </button>

                    {isAssigneeOpen && (
                      <div className="absolute top-full left-2 right-0 mt-1 bg-[#282E33] border border-gray-600 rounded-md shadow-xl z-50 py-1 max-h-48 overflow-y-auto overscroll-contain will-change-transform">
                        <button
                          onClick={() => {
                            setAssigneeId(null);
                            setAssigneeName("Unassigned");
                            setIsAssigneeOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-400 hover:bg-gray-700 transition-colors"
                        >
                          <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-[9px] text-white shrink-0">
                            ?
                          </div>
                          Unassigned
                        </button>
                        <div className="h-px bg-gray-700 my-1"></div>
                        {employeesList.map((emp) => {
                          const empName =
                            emp.name || emp.full_name || "Unknown";
                          return (
                            <button
                              key={emp.id}
                              onClick={() => {
                                setAssigneeId(emp.id);
                                setAssigneeName(empName);
                                setIsAssigneeOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-200 hover:bg-blue-600 hover:text-white transition-colors group"
                            >
                              <div className="w-5 h-5 rounded-full bg-[#F59E0B] overflow-hidden flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                                {emp.avatar_url ? (
                                  <img
                                    src={emp.avatar_url}
                                    alt=""
                                    loading="lazy"
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  getInitials(empName)
                                )}
                              </div>
                              <span className="truncate">{empName}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between relative">
                  <span className="text-gray-400 font-medium w-24">
                    Priority
                  </span>
                  <div className="flex-1 relative">
                    <button
                      onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                      className="w-full flex items-center justify-between text-gray-200 bg-transparent hover:bg-gray-700 border border-transparent hover:border-gray-600 rounded px-2 py-1 -ml-2 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CurrentPriorityIcon
                          className={`w-4 h-4 stroke-3 ${currentPriorityColor}`}
                        />
                        {priority}
                      </div>
                      <ChevronDownIcon className="w-3 h-3 text-gray-400" />
                    </button>

                    {isPriorityOpen && (
                      <div className="absolute top-full left-2 right-0 mt-1 bg-[#282E33] border border-gray-600 rounded-md shadow-xl z-50 py-1 overflow-y-auto overscroll-contain will-change-transform">
                        {PRIORITY_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          return (
                            <button
                              key={option.name}
                              onClick={() => {
                                setPriority(option.name);
                                setIsPriorityOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-200 hover:bg-blue-600 hover:text-white transition-colors"
                            >
                              <Icon
                                className={`w-4 h-4 stroke-3 ${option.color} group-hover:text-white`}
                              />
                              {option.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium w-24">
                    Due date
                  </span>
                  <div className="flex-1 relative">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-transparent text-gray-200 w-full outline-none border border-transparent hover:bg-gray-700 hover:border-gray-600 focus:border-blue-500 rounded px-2 py-1 -ml-2 transition-colors dark:color-scheme:dark"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium w-24">
                    Start date
                  </span>
                  <div className="flex-1 relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent text-gray-200 w-full outline-none border border-transparent hover:bg-gray-700 hover:border-gray-600 focus:border-blue-500 rounded px-2 py-1 -ml-2 transition-colors dark:color-scheme:dark"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium w-24">
                    Project
                  </span>
                  <div className="flex-1 flex items-center gap-2 text-gray-200 bg-transparent hover:bg-gray-700 border border-transparent hover:border-gray-600 rounded px-2 py-1 -ml-2 transition-colors">
                    <BriefcaseIcon className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      placeholder="None"
                      className="bg-transparent w-full outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium w-24">
                    Division
                  </span>
                  <div className="flex-1 flex items-center gap-2 text-gray-200 bg-transparent hover:bg-gray-700 border border-transparent hover:border-gray-600 rounded px-2 py-1 -ml-2 transition-colors">
                    <HashtagIcon className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      placeholder="None"
                      className="bg-transparent w-full outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
