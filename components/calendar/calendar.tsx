"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid"; // a plugin!
import timeGridPlugin from "@fullcalendar/timegrid";

export default function Calendar() {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin]}
      initialView="timeGridWeek"
      firstDay={1} // Set week to start on Monday
      height={"85%"}
      slotLabelFormat={{
        hour: "2-digit",
        minute: "2-digit",
        hour12: false, // 24-hour format for the time slots
      }}
      eventTimeFormat={{
        hour: "2-digit",
        minute: "2-digit",
        hour12: false, // 24-hour format for the events
      }}
    />
  );
}
