import React from 'react';
import { RenderElementProps, ReactEditor } from 'slate-react';
import type { ReactElement } from 'react';
import { useSlate } from 'slate-react';
import { Transforms } from 'slate';

import { EmptyText, CustomText, CustomEditor } from './types';

// Define the types for our custom elements
export type ParagraphElement = {
  type: 'paragraph';
  children: (CustomText | EmptyText)[];
};

export type HeadingElement = {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: (CustomText | EmptyText)[];
};

export type ListItemElement = {
  type: 'list-item';
  children: (CustomText | EmptyText)[];
};

export type BulletedListElement = {
  type: 'bulleted-list';
  children: (CustomText | EmptyText)[];
};

export type NumberedListElement = {
  type: 'numbered-list';
  children: (CustomText | EmptyText)[];
};

export type BlockQuoteElement = {
  type: 'block-quote';
  children: (CustomText | EmptyText)[];
};

export type ChecklistItemElement = {
  type: 'checklist-item';
  checked: boolean;
  children: (CustomText | EmptyText)[];
};

export type ChecklistElement = {
  type: 'checklist';
  children: ChecklistItemElement[];
};

// Union type for all custom elements
export type CustomElement = 
  | ParagraphElement 
  | HeadingElement 
  | ListItemElement 
  | BulletedListElement 
  | NumberedListElement 
  | BlockQuoteElement
  | ChecklistItemElement
  | ChecklistElement;

// Type for render element props with our custom element type
export type CustomRenderElementProps = RenderElementProps & {
  element: CustomElement;
};

// Checkbox component for checklist items
const CheckboxComponent = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => {
  return (
    <span 
      contentEditable={false} 
      className="mr-2 inline-flex"
      onClick={(e) => {
        e.preventDefault();
        onChange();
      }}
    >
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={(e) => {
          e.preventDefault();
          onChange();
        }}
        className="mr-1 h-4 w-4 cursor-pointer"
      />
    </span>
  );
};

// Render element component
export const RenderElement = (props: CustomRenderElementProps): ReactElement => {
  const { attributes, children, element } = props;
  const editor = useSlate() as CustomEditor;

  switch (element.type) {
    case 'paragraph':
      return <p {...attributes}>{children}</p>;
    case 'heading':
      switch (element.level) {
        case 1:
          return <h1 {...attributes}>{children}</h1>;
        case 2:
          return <h2 {...attributes}>{children}</h2>;
        case 3:
          return <h3 {...attributes}>{children}</h3>;
        case 4:
          return <h4 {...attributes}>{children}</h4>;
        case 5:
          return <h5 {...attributes}>{children}</h5>;
        case 6:
          return <h6 {...attributes}>{children}</h6>;
        default:
          return <h2 {...attributes}>{children}</h2>;
      }
    case 'bulleted-list':
      return <ul {...attributes}>{children}</ul>;
    case 'numbered-list':
      return <ol {...attributes}>{children}</ol>;
    case 'list-item':
      return <li {...attributes}>{children}</li>;
    case 'checklist-item':
      return (
        <div className="flex items-start" {...attributes}>
          <CheckboxComponent 
            checked={element.checked} 
            onChange={() => {
              const path = ReactEditor.findPath(editor, element);
              Transforms.setNodes<ChecklistItemElement>(
                editor,
                { checked: !element.checked },
                { at: path }
              );
            }}
          />
          <span className={element.checked ? "line-through text-gray-500" : ""}>
            {children}
          </span>
        </div>
      );
    case 'checklist':
      return <div className="checklist" {...attributes}>{children}</div>;
    case 'block-quote':
      return <blockquote {...attributes}>{children}</blockquote>;
    default:
      return <p {...attributes}>{children}</p>;
  }
};