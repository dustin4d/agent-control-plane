import { Decisions } from "./components/Decisions";
import { PolicyWarnings } from "./components/PolicyWarnings";
import { TaskQueue } from "./components/TaskQueue";
import { UserAgentPrompt } from "./components/UserAgentPrompt";

export default function App() {
  return (
    <div className="flex min-h-full flex-col lg:h-full">
      <header className="flex items-center gap-2 border-b border-line bg-panel px-4 py-2">
        <span className="h-3 w-3 rotate-45 rounded-sm border-2 border-policy" aria-hidden />
        <h1 className="font-semibold tracking-wide">Policy Mesh</h1>
      </header>
      <main className="grid flex-1 grid-cols-1 gap-3 p-3 lg:min-h-0 lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)]">
        <UserAgentPrompt />
        <Decisions />
        <PolicyWarnings />
        <TaskQueue />
      </main>
    </div>
  );
}
