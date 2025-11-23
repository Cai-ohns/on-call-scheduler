'use client';

import { useEffect, useRef, useState } from 'react';
import { Draggable } from '@fullcalendar/interaction';

interface Task {
  id: string;
  title: string;
}

const initialTasks: Task[] = [
  { id: '1', title: 'Buy Groceries' },
  { id: '2', title: 'Email Team' },
  { id: '3', title: 'Gym' }
];

export default function TaskSidebar() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const taskListRef = useRef<HTMLUListElement>(null);
  const draggableInstancesRef = useRef<Draggable[]>([]);

  useEffect(() => {
    // Cleanup previous draggable instances
    draggableInstancesRef.current.forEach(instance => {
      instance.destroy();
    });
    draggableInstancesRef.current = [];

    if (taskListRef.current) {
      const taskItems = taskListRef.current.querySelectorAll('li');
      
      taskItems.forEach((item) => {
        const draggable = new Draggable(item as HTMLElement, {
          eventData: function(eventEl) {
            const eventData = eventEl.getAttribute('data-event');
            if (eventData) {
              return JSON.parse(eventData);
            }
            return null;
          }
        });
        draggableInstancesRef.current.push(draggable);
      });
    }

    // Cleanup function
    return () => {
      draggableInstancesRef.current.forEach(instance => {
        instance.destroy();
      });
      draggableInstancesRef.current = [];
    };
  }, [tasks]);

  const handleAddTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedTitle = newTaskTitle.trim();
    
    if (trimmedTitle) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: trimmedTitle
      };
      setTasks(prevTasks => [...prevTasks, newTask]);
      setNewTaskTitle('');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  return (
    <div className="w-80 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b border-gray-100">
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Tasks
        </h2>
        <p className="text-sm text-gray-500 mt-1">Drag tasks to calendar</p>
      </div>
      
      {/* Add Task Form */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <form onSubmit={handleAddTask}>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="New task..."
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 active:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Task List */}
      <ul ref={taskListRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            data-event={JSON.stringify({
              title: task.title,
              duration: { days: 1 }
            })}
            className="cursor-move bg-white border border-gray-200 rounded-xl p-3.5 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm active:scale-[0.98] flex items-center justify-between group transition-all duration-200"
          >
            <span className="flex-1 text-sm text-gray-900 font-medium pr-2">
              {task.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTask(task.id);
              }}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
              aria-label={`Delete ${task.title}`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="text-center py-12">
            <div className="text-gray-400 text-sm">No tasks yet</div>
            <div className="text-gray-300 text-xs mt-1">Add one above to get started</div>
          </li>
        )}
      </ul>
    </div>
  );
}
