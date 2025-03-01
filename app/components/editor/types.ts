import { Editor } from 'slate';
import { ReactEditor } from 'slate-react';

// Custom text types
export interface CustomText {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
}

export type EmptyText = {
  text: string;
};

// Custom editor type
export type CustomEditor = Editor & ReactEditor & {
  // Add any custom methods here if needed
};

// Additional type for checklist items
export interface ChecklistItemData {
  checked: boolean;
}