export type Id = string | number;

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Subtask {
  id: Id;
  title: string;
  isCompleted: boolean;
}

export interface Column {
  id: Id;
  title: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface Assignee {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Task {
  id: Id;
  columnId: Id;
  title: string;
  desc?: string;
  tags?: string[];
  deadlineDate?: string;
  deadlineTime?: string;
  priority?: Priority;
  progress?: number;
  subtasks?: Subtask[];
  tableData?: string[][]; // Dữ liệu cho dạng bảng động
  attachments?: Attachment[];
  assignees?: Assignee[];
  pinned?: boolean;
}
