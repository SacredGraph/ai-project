import React from 'react';
import { Transforms } from 'slate';
import { RenderElementProps, useSlateStatic, ReactEditor } from 'slate-react';
import type { ReactElement } from 'react';

import { EmptyText, CustomText, CustomElement as TypesCustomElement } from './types';

// Define the types for our custom elements
export type ParagraphElement = {
  type: 'paragraph';
  children: (CustomText | EmptyText)[];
};

export type HeadingOneElement = {
  type: 'heading-one';
  children: (CustomText | EmptyText)[];
};

export type HeadingTwoElement = {
  type: 'heading-two';
  children: (CustomText | EmptyText)[];
};

export type HeadingThreeElement = {
  type: 'heading-three';
  children: (CustomText | EmptyText)[];
};

export type HeadingFourElement = {
  type: 'heading-four';
  children: (CustomText | EmptyText)[];
};

export type HeadingFiveElement = {
  type: 'heading-five';
  children: (CustomText | EmptyText)[];
};

export type HeadingSixElement = {
  type: 'heading-six';
  children: (CustomText | EmptyText)[];
};

export type ListItemElement = {
  type: 'list-item';
  children: (CustomText | EmptyText)[];
};

export type ChecklistItemElement = {
  type: 'checklist-item';
  checked: boolean;
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

export type ChecklistElement = {
  type: 'checklist';
  children: ChecklistItemElement[];
};

// Union type for all custom elements
export type CustomElement = 
  | ParagraphElement 
  | HeadingOneElement
  | HeadingTwoElement
  | HeadingThreeElement
  | HeadingFourElement
  | HeadingFiveElement
  | HeadingSixElement
  | ListItemElement 
  | ChecklistItemElement
  | BulletedListElement 
  | NumberedListElement 
  | BlockQuoteElement
  | ChecklistElement;

// Type for render element props with our custom element type
export type CustomRenderElementProps = Omit<RenderElementProps, 'element'> & {
  element: TypesCustomElement;
};

// Removed unused CheckboxComponent

// Render element component
export const RenderElement = (props: CustomRenderElementProps): ReactElement => {
  const { attributes, children, element } = props;
  const editor = useSlateStatic();

  // Handle checkbox click to toggle the checked state
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(
      editor,
      { checked: event.target.checked },
      { at: path }
    );
  };

  switch (element.type) {
    case 'paragraph':
      return <p {...attributes}>{children}</p>;
    case 'heading-one':
      return <h1 {...attributes}>{children}</h1>;
    case 'heading-two':
      return <h2 {...attributes}>{children}</h2>;
    case 'heading-three':
      return <h3 {...attributes}>{children}</h3>;
    case 'heading-four':
      return <h4 {...attributes}>{children}</h4>;
    case 'heading-five':
      return <h5 {...attributes}>{children}</h5>;
    case 'heading-six':
      return <h6 {...attributes}>{children}</h6>;
    case 'bulleted-list':
      return <ul {...attributes}>{children}</ul>;
    case 'numbered-list':
      return <ol {...attributes}>{children}</ol>;
    case 'list-item':
      return <li {...attributes}>{children}</li>;
    case 'checklist-item':
      return (
        <div
          {...attributes}
          className="flex items-start gap-2 my-1 pl-1"
          contentEditable={false}
        >
          <span contentEditable={false} className="mr-2 mt-[3px]">
            <input
              type="checkbox"
              checked={element.checked || false}
              onChange={handleCheckboxChange}
            />
          </span>
          <span contentEditable>{children}</span>
        </div>
      );
    case 'block-quote':
      return <blockquote {...attributes}>{children}</blockquote>;
    default:
      return <p {...attributes}>{children}</p>;
  }
};