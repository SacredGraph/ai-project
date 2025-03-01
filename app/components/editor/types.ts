import { Editor } from 'slate';

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
export type CustomEditor = Editor & {
  // Add any custom methods here if needed
};