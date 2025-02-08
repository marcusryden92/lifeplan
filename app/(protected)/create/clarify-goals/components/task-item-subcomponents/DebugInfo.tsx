import { Planner } from "@/lib/planner-class";

const DebugInfo: React.FC<{ task: Planner; devMode: boolean }> = ({
  task,
  devMode,
}) => {
  if (!devMode) return null;

  return (
    <span className="flex space-x-2 items-center">
      {task.dependency && (
        <span>
          <span className="italic">DE: </span>
          {task.dependency.substring(0, 4)}
        </span>
      )}
      <span>
        <span className="font-bold">ID: </span>
        {task.id.substring(0, 4)}
      </span>
    </span>
  );
};

export default DebugInfo;
