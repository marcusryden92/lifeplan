// useServerSyncQueue.tsx
import { useRef, useCallback } from "react";
import { Planner } from "@/prisma/generated/client";
import { SimpleEvent } from "@/prisma/generated/client";
import { EventTemplate } from "@/prisma/generated/client";
import { handleServerTransaction } from "@/utils/server-handlers/compareCalendarData";

// Define UpdateOperation type for our queue
type UpdateOperation = {
  // The current client state to send to the server
  clientPlanner: Planner[];
  clientCalendar: SimpleEvent[];
  clientTemplate: EventTemplate[];
  // For tracking which operation is complete (used for promise resolution)
  operationId: string;
};

export const useServerSyncQueue = (userId?: string) => {
  // Queue system refs
  const updateQueue = useRef<UpdateOperation[]>([]);
  const isProcessing = useRef(false);

  // Previous state refs to track what the server has
  const previousPlanner = useRef<Planner[]>([]);
  const previousCalendar = useRef<SimpleEvent[]>([]);
  const previousTemplate = useRef<EventTemplate[]>([]);

  // Initialize previous state
  const initializeState = useCallback(
    (
      planner: Planner[],
      calendar: SimpleEvent[],
      template: EventTemplate[]
    ) => {
      previousPlanner.current = planner;
      previousCalendar.current = calendar;
      previousTemplate.current = template;
    },
    []
  );

  // Helper function that processes optional update parameters
  const processInput = useCallback(
    <T>(update: T | ((prev: T) => T) | undefined, currentValue: T): T => {
      if (update === undefined) return currentValue;
      return typeof update === "function"
        ? (update as (prev: T) => T)(currentValue)
        : update;
    },
    []
  );

  // Function to process the server sync queue
  const processServerQueue = useCallback(
    async (
      setPlanner: React.Dispatch<React.SetStateAction<Planner[]>>,
      setCalendar: React.Dispatch<React.SetStateAction<SimpleEvent[]>>,
      setTemplate: React.Dispatch<React.SetStateAction<EventTemplate[]>>
    ) => {
      // If already processing or queue is empty, return
      if (isProcessing.current || updateQueue.current.length === 0) return;

      isProcessing.current = true;

      try {
        // Get the next operation from the queue
        const operation = updateQueue.current[0];

        // Perform server sync - note we're passing the refs as expected by handleServerTransaction
        const response = await handleServerTransaction(
          userId as string,
          operation.clientPlanner,
          previousPlanner,
          operation.clientCalendar,
          previousCalendar,
          operation.clientTemplate,
          previousTemplate
        );

        if (response.success) {
          console.log("Server sync success!");
          // Update the previous refs to the current state
          previousPlanner.current = operation.clientPlanner;
          previousCalendar.current = operation.clientCalendar;
          previousTemplate.current = operation.clientTemplate;
        } else {
          console.log("Server sync failure! Rolling back client state...");
          // Roll back to the previous server state
          setPlanner(previousPlanner.current);
          setCalendar(previousCalendar.current);
          setTemplate(previousTemplate.current);
        }
      } catch (error) {
        console.error("Error processing server sync:", error);
      } finally {
        // Remove the processed operation from the queue
        updateQueue.current.shift();
        isProcessing.current = false;

        // If there are more operations in the queue, process the next one
        if (updateQueue.current.length > 0) {
          processServerQueue(setPlanner, setCalendar, setTemplate);
        }
      }
    },
    [userId]
  );

  // Queue an update for server sync and return a promise
  const queueServerSync = useCallback(
    (
      newPlanner: Planner[],
      newCalendar: SimpleEvent[],
      newTemplate: EventTemplate[],
      setPlanner: React.Dispatch<React.SetStateAction<Planner[]>>,
      setCalendar: React.Dispatch<React.SetStateAction<SimpleEvent[]>>,
      setTemplate: React.Dispatch<React.SetStateAction<EventTemplate[]>>
    ): Promise<void> => {
      // Create unique ID for this operation
      const operationId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create the operation object for the server sync queue
      const operation: UpdateOperation = {
        clientPlanner: newPlanner,
        clientCalendar: newCalendar,
        clientTemplate: newTemplate,
        operationId,
      };

      // Only queue server sync operation if user is logged in
      if (userId) {
        // Add to queue
        updateQueue.current.push(operation);

        // Start processing if not already in progress
        if (!isProcessing.current) {
          processServerQueue(setPlanner, setCalendar, setTemplate);
        }
      } else {
        // If no user ID, just update the previous refs
        previousPlanner.current = newPlanner;
        previousCalendar.current = newCalendar;
        previousTemplate.current = newTemplate;
      }

      return new Promise<void>((resolve) => {
        if (!userId) {
          // If no server sync needed, resolve immediately
          resolve();
          return;
        }

        // Set up a check to resolve the promise when this operation is done
        const checkQueue = setInterval(() => {
          if (
            !updateQueue.current.some((op) => op.operationId === operationId)
          ) {
            clearInterval(checkQueue);
            resolve();
          }
        }, 100);
      });
    },
    [userId, processServerQueue]
  );

  return {
    processInput,
    queueServerSync,
    initializeState,
  };
};
