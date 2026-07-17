// One engine representation for both user-facing precedence concepts.
// `source` says which surface authored the edge; `queueId` is set only for
// queue edges so violation messages can name the pipe.
export type PrecedenceSource = "queue" | "dependency";

export type PrecedenceEdge = {
  fromId: string;
  toId: string;
  source: PrecedenceSource;
  queueId?: string;
};
