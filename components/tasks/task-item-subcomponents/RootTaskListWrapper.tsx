"use client";

import React from "react";

const RootTaskListWrapper = ({
  subtasksLength,
  children,
}: {
  subtasksLength: number;
  children: React.ReactNode;
}) => {
  return (
    <>
      {subtasksLength > 0 && (
        <div
          style={{
            height: "auto",
            transition: "height ease 1000ms",
          }}
          className={`overflow-x-hidden overflow-y-auto flex-1`}
        >
          {children}
        </div>
      )}
    </>
  );
};

export default RootTaskListWrapper;
