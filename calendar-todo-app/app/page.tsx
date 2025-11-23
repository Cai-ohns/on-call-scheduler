import MainCalendar from '@/components/MainCalendar';
import TaskSidebar from '@/components/TaskSidebar';

export default function Home() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <TaskSidebar />
      <div className="flex-1 h-full overflow-hidden">
        <MainCalendar />
      </div>
    </div>
  );
}
