import * as s from "./ReflowDemo.css";

const HOURS = [
  { label: "9:00", top: 0 },
  { label: "11:00", top: 80 },
  { label: "13:00", top: 160 },
  { label: "15:00", top: 240 },
];

export function ReflowDemo() {
  return (
    <div className={s.card} aria-hidden>
      <div className={s.header}>
        <span className={s.day}>Tuesday</span>
        <span className={s.chip}>Meeting added</span>
      </div>
      <div className={s.canvas}>
        {HOURS.map((h) => (
          <span key={h.label} className={s.hour} style={{ top: h.top }}>
            {h.label}
          </span>
        ))}
        <div className={s.blockDeep}>Deep work</div>
        <div className={s.blockMeeting}>Meeting</div>
        <div className={s.blockWriting}>Writing</div>
        <div className={s.blockGym}>Gym</div>
      </div>
    </div>
  );
}
