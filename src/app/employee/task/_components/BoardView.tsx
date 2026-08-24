import { Droppable, Draggable } from "@hello-pangea/dnd";
import Image from "next/image";
import {
  DocumentTextIcon,
  CalendarDaysIcon,
  QueueListIcon,
  PlusIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

export default function BoardView({
  columnsOrder,
  columnsData,
  setEditingTask,
  formatDeadline,
  openDropdownId,
  setOpenDropdownId,
  renderWorkTypeIcon,
  handleAssignWorkType,
  workTypes,
  setIsModalOpen,
  renderPriorityIcon,
  avatarUrl,
  user,
  getInitials,
  quickCreateCol,
  setQuickCreateCol,
  quickCreateTitle,
  setQuickCreateTitle,
  handleQuickCreateTask,
  resetQuickCreate,
  quickCreateWtId,
  setQuickCreateWtId,
  openQuickCreateDropdown,
  setOpenQuickCreateDropdown,
  formatShortDate,
  quickCreateDate,
  setQuickCreateDate,
  isCreating,
}: any) {
  return (
    <Droppable droppableId="board" direction="horizontal" type="COLUMN">
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="flex items-start min-w-max pb-8 h-full"
        >
          {columnsOrder.map((columnId: string, index: number) => (
            <Draggable key={columnId} draggableId={columnId} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  style={provided.draggableProps.style}
                  className="pr-4"
                >
                  <div
                    className={`group w-[320px] flex flex-col bg-white/40 dark:bg-[#001436]/40 rounded-2xl p-3 shadow-sm border ${snapshot.isDragging ? "border-[#007BFF] shadow-2xl z-50 ring-2 ring-[#007BFF]/20" : "border-white/20"}`}
                  >
                    <div
                      {...provided.dragHandleProps}
                      className="flex justify-between items-center mb-4 px-2 py-1 cursor-grab active:cursor-grabbing hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <h2 className="font-bold text-[15px] text-gray-900 dark:text-white uppercase tracking-wider">
                        {columnId}
                      </h2>
                      <span className="bg-white/80 dark:bg-white/10 text-gray-700 dark:text-gray-200 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                        {columnsData[columnId]?.length || 0}
                      </span>
                    </div>

                    <Droppable droppableId={columnId}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 min-h-[150px] flex flex-col transition-all rounded-xl p-1 pb-4 ${snapshot.isDraggingOver ? "bg-white/30 dark:bg-white/10 ring-2 ring-white/50" : ""}`}
                        >
                          {columnsData[columnId]?.map(
                            (task: any, index: number) => {
                              const totalSubtasks = task.subtasks?.length || 0;
                              const completedSubtasks =
                                task.subtasks?.filter(
                                  (s: any) => s.status === "Done",
                                ).length || 0;
                              const hasSubtasks = totalSubtasks > 0;

                              return (
                                <Draggable
                                  key={String(task.id)}
                                  draggableId={String(task.id)}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      style={provided.draggableProps.style}
                                      className="pb-3"
                                    >
                                      <div
                                        onClick={() => setEditingTask(task)}
                                        className={`cursor-pointer bg-white dark:bg-[#002B6B] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 select-none ${snapshot.isDragging ? "shadow-2xl ring-2 ring-[#007BFF] z-50" : "hover:shadow-md"}`}
                                      >
                                        <div className="flex justify-between items-start mb-2 group/title">
                                          <h3 className="font-bold text-gray-800 dark:text-white text-[15px] leading-tight pr-2">
                                            {task.title}
                                          </h3>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingTask(task);
                                            }}
                                            className="p-1 rounded opacity-100 group-hover/title:opacity-100 hover:bg-gray-200 dark:hover:bg-white/10 transition-all cursor-pointer"
                                          >
                                            <DocumentTextIcon className="w-4 h-4 text-white dark:text-gray-300" />
                                          </button>
                                        </div>

                                        {task.description && (
                                          <p className="text-gray-500 dark:text-gray-400 text-xs mb-3 line-clamp-2">
                                            {task.description}
                                          </p>
                                        )}

                                        {/* --- FIX 1: ADDED 'title="Due date"' FOR HOVER LABEL --- */}
                                        <div
                                          title="Due date"
                                          className="group/carddate relative inline-flex items-center text-xs font-medium text-gray-400 dark:text-gray-300 mb-3"
                                        >
                                          <div className="flex items-center px-1.5 py-1 -ml-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-colors cursor-default">
                                            <CalendarDaysIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                            {formatDeadline(
                                              task.task_date || task.deadline,
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-50 dark:border-white/10">
                                          <div className="flex items-center gap-1.5">
                                            {/* --- FIX 2: WORK TYPE BUTTON WITH DROPDOWN MENU --- */}
                                            <div className="relative">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setOpenDropdownId(
                                                    openDropdownId ===
                                                      String(task.id)
                                                      ? null
                                                      : String(task.id),
                                                  );
                                                }}
                                                title="Change work type"
                                                className="flex items-center gap-1 p-1 -ml-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                                              >
                                                {renderWorkTypeIcon(
                                                  task.work_types,
                                                  "w-4 h-4",
                                                )}
                                              </button>

                                              {/* The actual dropdown menu logic */}
                                              {openDropdownId ===
                                                String(task.id) && (
                                                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#282E33] border border-gray-200 dark:border-gray-700 shadow-2xl rounded-md py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                                  <div className="px-3 py-2 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700/50 mb-1">
                                                    Change work type
                                                  </div>
                                                  {workTypes?.map((wt: any) => (
                                                    <button
                                                      key={wt.id}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAssignWorkType(
                                                          task.id,
                                                          wt.id,
                                                        );
                                                      }}
                                                      className="w-full flex items-center gap-3 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#38414A] transition-colors text-left"
                                                    >
                                                      {renderWorkTypeIcon(
                                                        wt,
                                                        "w-4 h-4",
                                                      )}
                                                      {wt.name}
                                                    </button>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2.5">
                                            {hasSubtasks && (
                                              <div className="group/sub relative flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                                <QueueListIcon className="w-4 h-4" />
                                                <div className="absolute bottom-full right-0 mb-1 hidden group-hover/sub:block z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                                                  <div className="bg-[#E2E4E9] dark:bg-gray-200 text-[#172B4D] text-xs font-medium px-2.5 py-1.5 rounded shadow-md whitespace-nowrap border border-gray-300">
                                                    {completedSubtasks} of{" "}
                                                    {totalSubtasks} sub tasks
                                                    complete
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            {/* --- FIX 3: ADDED 'title' TO PRIORITY ICON --- */}
                                            <div
                                              title={task.priority || "Medium"}
                                              className="group/pri relative flex items-center transition-colors"
                                            >
                                              {renderPriorityIcon(
                                                task.priority,
                                              )}
                                            </div>

                                            <div className="group/assignee relative flex items-center transition-transform hover:scale-110">
                                              <div className="w-6 h-6 rounded-full bg-[#F59E0B] flex items-center justify-center text-white text-[10px] font-bold shadow-sm border border-white dark:border-[#002B6B] overflow-hidden">
                                                {task.assignee_id ===
                                                  user?.id && avatarUrl ? (
                                                  <Image
                                                    src={avatarUrl}
                                                    alt="Assignee"
                                                    width={24}
                                                    height={24}
                                                    className="object-cover w-full h-full"
                                                  />
                                                ) : (
                                                  getInitials(
                                                    task.assignee_name,
                                                  )
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            },
                          )}
                          {provided.placeholder}

                          {quickCreateCol === columnId ? (
                            <div className="mt-1 bg-white dark:bg-[#002B6B] p-3 rounded-xl shadow-md border-2 border-[#007BFF] animate-in fade-in zoom-in-95 duration-200">
                              <input
                                autoFocus
                                type="text"
                                value={quickCreateTitle}
                                onChange={(e) =>
                                  setQuickCreateTitle(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleQuickCreateTask(columnId);
                                  if (e.key === "Escape") resetQuickCreate();
                                }}
                                placeholder="What needs to be done?"
                                className="w-full text-sm font-medium outline-none bg-transparent text-gray-800 dark:text-white placeholder-gray-400 mb-4"
                              />
                              <div className="flex justify-between items-center gap-2">
                                <div className="flex gap-1.5 shrink-0 ml-auto">
                                  <button
                                    onClick={resetQuickCreate}
                                    className="px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleQuickCreateTask(columnId)
                                    }
                                    disabled={isCreating}
                                    className="px-2.5 py-1.5 text-xs font-bold bg-[#007BFF] text-white hover:bg-blue-600 rounded-lg shadow-sm disabled:opacity-50"
                                  >
                                    {isCreating ? "..." : "Create"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setQuickCreateCol(columnId);
                                setQuickCreateTitle("");
                              }}
                              className="opacity-0 group-hover:opacity-100 flex items-center gap-2 mt-1 p-2 w-full text-left text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-all duration-200"
                            >
                              <PlusIcon className="w-5 h-5" /> Create
                            </button>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}
