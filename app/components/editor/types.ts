import { BaseEditor, Descendant } from 'slate';
import { ReactEditor } from 'slate-react';
import { HistoryEditor } from 'slate-history';

// Custom element types
export type ElementType = 
  | 'paragraph' 
  | 'heading-one' 
  | 'heading-two' 
  | 'heading-three'
  | 'heading-four' 
  | 'heading-five' 
  | 'heading-six'
  | 'bulleted-list' 
  | 'numbered-list' 
  | 'list-item'
  | 'checklist-item'  // New checklist item type
  | 'block-quote';

export type CustomElement = {
  type: ElementType;
  children: Descendant[];
  checked?: boolean;  // For checklist items
};

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
export type CustomEditor = BaseEditor & ReactEditor & HistoryEditor;

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor;
    Element: CustomElement;
    Text: CustomText | EmptyText;
  }
}