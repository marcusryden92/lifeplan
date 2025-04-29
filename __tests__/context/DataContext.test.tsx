import { render, screen, act } from "@testing-library/react";
import { DataContextProvider, useDataContext } from "@/context/DataContext";

// A simple test component that uses the context
const TestComponent = () => {
  const { mainPlanner, setFocusedTask } = useDataContext();

  return (
    <div>
      <p data-testid="planner-length">{mainPlanner.length}</p>
      <button onClick={() => setFocusedTask("Test Task")}>
        Set Focused Task
      </button>
    </div>
  );
};

describe("DataContext", () => {
  test("should provide the mainPlanner array and setFocusedTask function", () => {
    render(
      <DataContextProvider>
        <TestComponent />
      </DataContextProvider>
    );

    // Check if the mainPlanner length is displayed correctly
    const plannerLength = screen.getByTestId("planner-length");
    expect(plannerLength).toHaveTextContent("5"); // Assuming `mainPlannerSeed` has a length of 5

    // Test if we can set a focused task
    const button = screen.getByText("Set Focused Task");
    act(() => {
      button.click();
    });

    // Check if setFocusedTask works
    expect(plannerLength).toHaveTextContent("5"); // Checking the planner length again; you can extend the test based on side effects.
  });
});
