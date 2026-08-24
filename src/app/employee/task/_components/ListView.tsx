import React, { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  ArrowTurnDownRightIcon,
  PlusIcon,
  ViewColumnsIcon,
} from "@heroicons/react/24/outline";
import { Droppable, Draggable } from "@hello-pangea/dnd";

const PRIORITY_WEIGHT: Record<string, number> = {
  Highest: 5,
  High: 4,
  Medium: 3,
  Low: 2,
  Lowest: 1,
};

const INITIAL_COLUMNS = [
  { key: "title", label: "Work", defaultWidth: 350, type: "text" },
  { key: "assignee_name", label: "Assignee", defaultWidth: 200, type: "text" },
  { key: "priority", label: "Priority", defaultWidth: 130, type: "priority" },
  { key: "status", label: "Status", defaultWidth: 150, type: "text" },
  { key: "start_date", label: "Start date", defaultWidth: 140, type: "date" },
  { key: "deadline", label: "Due date", defaultWidth: 140, type: "date" },
];

export default function ListView({
  listTasks,
  setEditingTask,
  user,
  avatarUrl,
  getInitials,
  renderPriorityIcon,
  formatDeadline,
  quickCreateCol,
  setQuickCreateCol,
  quickCreateTitle,
  setQuickCreateTitle,
  handleQuickCreateTask,
  resetQuickCreate,
  isCreating,
  listColumns,
  onUpdateColumns,
}: any) {
  const [localColumns, setLocalColumns] = useState(listColumns);
  const columnsRef = useRef(localColumns);

  useEffect(() => {
    setLocalColumns(listColumns);
    columnsRef.current = listColumns;
  }, [listColumns]);

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc" | null;
  }>({ key: "start_date", direction: "desc" });
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string | number>>(
    new Set(),
  );

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const toggleColumn = (colKey: string) => {
    const isVisible = localColumns.some((c: any) => c.key === colKey);
    let newCols;
    if (isVisible) {
      newCols = localColumns.filter((c: any) => c.key !== colKey);
    } else {
      const colToAdd = INITIAL_COLUMNS.find((c) => c.key === colKey);
      newCols = [...localColumns, colToAdd];
    }
    setLocalColumns(newCols);
    columnsRef.current = newCols;
    onUpdateColumns(newCols);
  };

  const handleSort = (key: string, direction: "asc" | "desc") => {
    setSortConfig({ key, direction });
    setActiveMenu(null);
  };

  const handleColumnAction = (action: string, key: string) => {
    const idx = localColumns.findIndex((c: any) => c.key === key);
    if (idx === -1) return;

    const newCols = [...localColumns];
    const [col] = newCols.splice(idx, 1);

    if (action === "first") newCols.unshift(col);
    else if (action === "left") newCols.splice(Math.max(0, idx - 1), 0, col);
    else if (action === "right")
      newCols.splice(Math.min(newCols.length, idx + 1), 0, col);
    else if (action === "last") newCols.push(col);

    setLocalColumns(newCols);
    columnsRef.current = newCols;
    onUpdateColumns(newCols);
    setActiveMenu(null);
  };

  const toggleSubtasks = (taskId: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) newExpanded.delete(taskId);
    else newExpanded.add(taskId);
    setExpandedTasks(newExpanded);
  };

  const sortedTasks = useMemo(() => {
    let sortableTasks = [...listTasks];
    if (sortConfig.key && sortConfig.direction) {
      sortableTasks.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "deadline") {
          aValue = a.task_date || a.deadline;
          bValue = b.task_date || b.deadline;
        }

        if (sortConfig.key === "priority") {
          aValue = PRIORITY_WEIGHT[a.priority || "Medium"];
          bValue = PRIORITY_WEIGHT[b.priority || "Medium"];
        } else if (
          sortConfig.key === "deadline" ||
          sortConfig.key === "start_date"
        ) {
          if (!aValue && bValue) return 1;
          if (aValue && !bValue) return -1;
          if (!aValue && !bValue) return 0;
          const timeA = new Date(aValue).getTime();
          const timeB = new Date(bValue).getTime();
          if (timeA < timeB) return sortConfig.direction === "asc" ? -1 : 1;
          if (timeA > timeB) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        } else {
          aValue = aValue ? String(aValue).toLowerCase() : "";
          bValue = bValue ? String(bValue).toLowerCase() : "";
        }
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableTasks;
  }, [listTasks, sortConfig]);

  const ColumnHeader = ({
    columnKey,
    label,
    defaultWidth,
    type = "text",
    provided,
    snapshot,
  }: any) => {
    const isMenuOpen = activeMenu === columnKey;
    const isSorted = sortConfig.key === columnKey;

    let sortAscLabel = "Sort A to Z";
    let sortDescLabel = "Sort Z to A";
    if (type === "date") {
      sortAscLabel = "Sort oldest to newest";
      sortDescLabel = "Sort newest to oldest";
    } else if (type === "priority") {
      sortAscLabel = "Sort lowest to highest";
      sortDescLabel = "Sort highest to lowest";
    }

    const startResize = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.pageX;
      const startWidth = defaultWidth;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const newWidth = Math.max(80, startWidth + (moveEvent.pageX - startX));
        const updatedCols = columnsRef.current.map((c: any) =>
          c.key === columnKey ? { ...c, defaultWidth: newWidth } : c,
        );
        setLocalColumns(updatedCols);
        columnsRef.current = updatedCols;
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        onUpdateColumns(columnsRef.current);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        style={{
          ...provided.draggableProps.style,
          width: `${defaultWidth}px`,
          minWidth: `${defaultWidth}px`,
          maxWidth: `${defaultWidth}px`,
        }}
        className={`relative border-r border-gray-200 dark:border-gray-700 group/header select-none transition-colors duration-150 shrink-0 flex flex-col justify-center ${
          snapshot.isDragging
            ? "shadow-2xl ring-2 ring-[#007BFF] z-50 bg-gray-50 dark:bg-[#22272B] opacity-95"
            : ""
        }`}
      >
        <div
          {...provided.dragHandleProps}
          className="flex items-center w-full h-full px-4 py-3 group hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-grab active:cursor-grabbing"
        >
          <span
            className="flex items-center gap-2 truncate text-gray-600 dark:text-gray-300 hover:text-[#007BFF] transition-colors flex-1"
            onClick={(e) => {
              e.stopPropagation();
              handleSort(
                columnKey,
                sortConfig.direction === "asc" ? "desc" : "asc",
              );
            }}
          >
            {label}
            {isSorted && (
              <span className="text-[10px] text-[#007BFF] font-bold">
                {sortConfig.direction === "asc" ? "↑" : "↓"}
              </span>
            )}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenu(isMenuOpen ? null : columnKey);
            }}
            onDragStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className={`ml-auto p-1.5 rounded-md transition-colors shrink-0 ${
              isMenuOpen
                ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                : "text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <EllipsisHorizontalIcon className="w-4 h-4" />
          </button>
        </div>

        <div
          onMouseDown={startResize}
          onDragStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#007BFF] z-20"
        />

        {isMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setActiveMenu(null)}
            ></div>
            <div className="absolute top-full right-0 mt-1 w-[260px] flex flex-col bg-white dark:bg-[#282E33] border border-gray-200 dark:border-gray-700 shadow-2xl rounded-md py-2 z-50 animate-in fade-in zoom-in-95 duration-100 font-normal">
              <button
                onClick={() => handleSort(columnKey, "asc")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#38414A] transition-colors"
              >
                {sortAscLabel}
              </button>
              <button
                onClick={() => handleSort(columnKey, "desc")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#38414A] transition-colors"
              >
                {sortDescLabel}
              </button>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1.5"></div>
              <button
                onClick={() => handleColumnAction("first", columnKey)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#38414A] transition-colors"
              >
                Move column to first position
              </button>
              <button
                onClick={() => handleColumnAction("left", columnKey)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#38414A] transition-colors"
              >
                Move column to left
              </button>
              <button
                onClick={() => handleColumnAction("right", columnKey)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#38414A] transition-colors"
              >
                Move column to right
              </button>
              <button
                onClick={() => handleColumnAction("last", columnKey)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#38414A] transition-colors"
              >
                Move column to last position
              </button>
              <button
                onClick={() => handleColumnAction("remove", columnKey)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#38414A] transition-colors"
              >
                Remove column
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderCell = (
    task: any,
    col: any,
    isSubtask: boolean,
    hasSubtasks: boolean,
    isExpanded: boolean,
  ) => {
    const cellStyle = {
      width: `${col.defaultWidth}px`,
      minWidth: `${col.defaultWidth}px`,
      maxWidth: `${col.defaultWidth}px`,
    };
    const baseClasses =
      "px-4 py-3 border-r border-gray-100 dark:border-gray-700/50 truncate shrink-0 flex items-center";

    switch (col.key) {
      case "title":
        return (
          <div key={col.key} style={cellStyle} className={baseClasses}>
            <div
              className={`flex items-center gap-2.5 ${isSubtask ? "pl-6" : ""}`}
            >
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {hasSubtasks ? (
                  <button
                    onClick={(e) => toggleSubtasks(task.id, e)}
                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-500 dark:text-gray-400"
                  >
                    {isExpanded ? (
                      <ChevronDownIcon className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    )}
                  </button>
                ) : isSubtask ? (
                  <ArrowTurnDownRightIcon className="w-3.5 h-3.5 text-gray-400" />
                ) : null}
              </div>
              <span
                className="text-[#007BFF] font-medium text-xs hover:underline shrink-0 cursor-pointer"
                onClick={() => setEditingTask(task)}
              >
                VK-{task.id}
              </span>
              <span className="text-gray-900 dark:text-gray-200 font-medium truncate">
                {task.title}
              </span>
            </div>
          </div>
        );
      case "assignee_name":
        return (
          <div key={col.key} style={cellStyle} className={baseClasses}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#F59E0B] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shadow-sm shrink-0">
                {task.assignee_id === user?.id && avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Assignee"
                    width={24}
                    height={24}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  getInitials(task.assignee_name)
                )}
              </div>
              <span className="text-gray-600 dark:text-gray-300 truncate">
                {task.assignee_name}
              </span>
            </div>
          </div>
        );
      case "priority":
        return (
          <div key={col.key} style={cellStyle} className={baseClasses}>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium">
              {renderPriorityIcon(task.priority)}
              <span className="truncate">{task.priority || "Medium"}</span>
            </div>
          </div>
        );
      case "status":
        return (
          <div key={col.key} style={cellStyle} className={baseClasses}>
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11px] font-bold px-2.5 py-1 rounded border border-gray-200 dark:border-gray-600 uppercase tracking-wider shadow-sm truncate inline-block">
              {task.status}
            </span>
          </div>
        );
      case "start_date":
        return (
          <div key={col.key} style={cellStyle} className={baseClasses}>
            <span className="text-gray-600 dark:text-gray-300 font-medium truncate">
              {formatDeadline(task.start_date)}
            </span>
          </div>
        );
      case "deadline":
        return (
          <div key={col.key} style={cellStyle} className={baseClasses}>
            <span className="text-gray-600 dark:text-gray-300 font-medium truncate">
              {formatDeadline(task.task_date || task.deadline)}
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  const renderRow = (task: any, isSubtask: boolean = false) => {
    const hasSubtasks = !isSubtask && task.subtasks && task.subtasks.length > 0;
    const isExpanded = expandedTasks.has(task.id);

    return (
      <div
        key={task.id}
        className={`flex w-full hover:bg-gray-50 dark:hover:bg-[#2A2E33] transition-colors group border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 ${
          isSubtask
            ? "bg-gray-50/50 dark:bg-white/2"
            : "bg-white dark:bg-[#1D2125]"
        }`}
      >
        <div className="px-4 py-3 w-12 min-w-12w shrink-0 border-r border-gray-100 dark:border-gray-700/50 flex items-center">
          <input
            type="checkbox"
            className="rounded border-gray-400 bg-transparent cursor-pointer w-4 h-4"
          />
        </div>

        {localColumns.map((col: any) =>
          renderCell(task, col, isSubtask, hasSubtasks, isExpanded),
        )}

        {/* --- NEW: THE INVISIBLE SPRING DIV --- */}
        <div className="flex-1 min-w-0 border-r border-gray-100 dark:border-gray-700/50"></div>

        <div className="px-4 py-3 sticky right-0 z-10 w-16 min-w-16 shrink-0 bg-white dark:bg-[#1D2125] group-hover:bg-gray-50 dark:group-hover:bg-[#2A2E33] shadow-[-12px_0_15px_-5px_rgba(0,0,0,0.05)] border-l border-gray-100 dark:border-gray-700/50 transition-colors flex items-center justify-center">
          <button
            onClick={() => setEditingTask(task)}
            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-[#007BFF] dark:hover:text-[#007BFF] hover:bg-blue-50 dark:hover:bg-[#007BFF]/10 transition-all opacity-100 group-hover:opacity-100"
          >
            <PencilSquareIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white dark:bg-[#1D2125] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in duration-300">
      <div className="overflow-x-auto pb-6">
        <div className="text-left text-sm whitespace-nowrap w-full flex flex-col min-w-max">
          {/* Header Row */}
          <div className="bg-gray-50 dark:bg-[#22272B] border-b border-gray-200 dark:border-gray-700 font-bold text-[11px] uppercase tracking-wider select-none flex w-full">
            <Droppable
              droppableId="list-columns"
              direction="horizontal"
              type="LIST_COLUMN"
            >
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex w-full"
                >
                  <div className="px-4 py-3 w-12 min-w-12 shrink-0 border-r border-gray-200 dark:border-gray-700"></div>

                  {localColumns.map((col: any, index: number) => (
                    <Draggable
                      key={col.key}
                      draggableId={col.key}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <ColumnHeader
                          columnKey={col.key}
                          label={col.label}
                          defaultWidth={col.defaultWidth}
                          type={col.type}
                          provided={provided}
                          snapshot={snapshot}
                        />
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {/* --- NEW: THE INVISIBLE SPRING DIV --- */}
                  <div className="flex-1 min-w-0 border-r border-gray-200 dark:border-gray-700"></div>

                  <div className="sticky right-0 z-10 w-16 min-w-16 shrink-0 bg-gray-50 dark:bg-[#22272B] border-l border-gray-200 dark:border-gray-700 shadow-[-12px_0_15px_-5px_rgba(0,0,0,0.05)] p-0 flex items-center justify-center">
                    <button
                      onClick={() => setIsConfigOpen(!isConfigOpen)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#38414A] transition-colors"
                      title="Configure columns"
                    >
                      <ViewColumnsIcon className="w-5 h-5" />
                    </button>

                    {isConfigOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setIsConfigOpen(false)}
                        ></div>
                        <div className="absolute top-full right-2 mt-1 w-56 bg-white dark:bg-[#282E33] border border-gray-200 dark:border-gray-700 shadow-2xl rounded-md py-2 z-50 animate-in fade-in zoom-in-95 duration-100 font-normal text-left">
                          <div className="px-4 py-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700/50 mb-1 pb-2">
                            Configure Columns
                          </div>

                          {INITIAL_COLUMNS.map((col) => {
                            const isVisible = localColumns.some(
                              (c: any) => c.key === col.key,
                            );
                            return (
                              <label
                                key={col.key}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#38414A] cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isVisible}
                                  onChange={() => toggleColumn(col.key)}
                                  className="mr-3 rounded border-gray-400 bg-transparent cursor-pointer w-4 h-4 text-[#007BFF] focus:ring-[#007BFF] focus:ring-offset-0"
                                />
                                {col.label}
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          </div>

          {/* Body Rows */}
          <div className="flex flex-col w-full">
            {sortedTasks.length === 0 ? (
              <div className="flex w-full">
                <div className="px-4 py-12 flex-1 text-center text-gray-500">
                  No tasks found in this view.
                </div>
              </div>
            ) : (
              sortedTasks.map((task: any) => (
                <React.Fragment key={task.id}>
                  {renderRow(task, false)}
                  {expandedTasks.has(task.id) &&
                    task.subtasks?.map((subtask: any) =>
                      renderRow(subtask, true),
                    )}
                </React.Fragment>
              ))
            )}

            {/* Quick Create Row */}
            {quickCreateCol === "list" ? (
              <div className="flex w-full bg-white dark:bg-[#1D2125] border-t border-gray-100 dark:border-gray-700/50">
                <div className="px-4 py-3 flex-1 flex items-center gap-4">
                  <input
                    autoFocus
                    type="text"
                    value={quickCreateTitle || ""}
                    onChange={(e) => setQuickCreateTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleQuickCreateTask("To do");
                      if (e.key === "Escape") resetQuickCreate();
                    }}
                    placeholder="What needs to be done?"
                    className="w-full max-w-lg text-sm font-medium outline-none bg-transparent text-gray-800 dark:text-white placeholder-gray-400"
                  />
                  <div className="flex gap-2 shrink-0 ml-auto">
                    <button
                      onClick={resetQuickCreate}
                      className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleQuickCreateTask("To do")}
                      disabled={isCreating}
                      className="px-4 py-1.5 text-xs font-bold bg-[#007BFF] text-white hover:bg-blue-600 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                    >
                      {isCreating ? "..." : "Create"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="group flex w-full bg-white dark:bg-[#1D2125] hover:bg-gray-50 dark:hover:bg-[#2A2E33] transition-colors cursor-pointer border-t border-gray-100 dark:border-gray-700/50"
                onClick={() => {
                  setQuickCreateCol("list");
                  setQuickCreateTitle("");
                }}
              >
                <div className="px-4 py-3 flex items-center text-gray-500 hover:text-gray-900 dark:hover:text-white font-medium text-sm gap-2">
                  <PlusIcon className="w-5 h-5" /> Create
                </div>

                {/* --- NEW: THE INVISIBLE SPRING DIV --- */}
                <div className="flex-1 min-w-0"></div>

                <div className="sticky right-0 z-10 w-16 min-w-16 shrink-0 bg-white dark:bg-[#1D2125] group-hover:bg-gray-50 dark:group-hover:bg-[#2A2E33] shadow-[-12px_0_15px_-5px_rgba(0,0,0,0.05)] border-l border-gray-100 dark:border-gray-700/50 transition-colors"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
