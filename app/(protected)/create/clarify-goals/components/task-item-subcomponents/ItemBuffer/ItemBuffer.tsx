import React from "react";
import styles from "./ItemBuffer.module.css";

// Buffer between task items which lights up when dragging an item between two other tasks
export default function ItemBuffer({ id }: { id: string }) {
  return <div id={id} className={styles.itemBuffer}></div>;
}
