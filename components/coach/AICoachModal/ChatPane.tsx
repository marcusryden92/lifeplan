"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui";
import type { ChatMessage } from "./useAICoachState";
import {
  wrap,
  messageList,
  empty,
  messageUser,
  messageAssistant,
  messageRole,
  messageContent,
  streamingDots,
  streamingDot,
  composer,
  textarea,
} from "./ChatPane.css";

interface ChatPaneProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatPane({ messages, onSend, disabled }: ChatPaneProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  const send = () => {
    const trimmed = draft.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className={wrap}>
      <div className={messageList} ref={listRef}>
        {messages.length === 0 ? (
          <div className={empty}>
            Describe how you want to restructure this goal.
            <br />
            The coach will propose changes and update the tree on the right.
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={m.role === "user" ? messageUser : messageAssistant}
            >
              {m.role === "assistant" && (
                <span className={messageRole}>coach</span>
              )}
              <span className={messageContent}>
                {m.content}
                {m.streaming && (
                  <span className={streamingDots} aria-label="streaming">
                    <span className={streamingDot} />
                    <span className={streamingDot} />
                    <span className={streamingDot} />
                  </span>
                )}
              </span>
            </div>
          ))
        )}
      </div>

      <div className={composer}>
        <textarea
          ref={textareaRef}
          className={textarea}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Message the coach…"
          rows={1}
          disabled={disabled}
        />
        <Button
          variant="solid"
          size="sm"
          onClick={send}
          disabled={disabled || draft.trim().length === 0}
          aria-label="Send"
        >
          <ArrowUp size={14} strokeWidth={2.4} />
        </Button>
      </div>
    </div>
  );
}
