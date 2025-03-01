import React from 'react';
import { RenderElementProps } from 'slate-react';
import type { ReactElement } from 'react';

import { EmptyText, CustomText } from './types';

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

// Union type for all custom elements
export type CustomElement = 
  | ParagraphElement 
  | HeadingElement 
  | ListItemElement 
  | BulletedListElement 
  | NumberedListElement 
  | BlockQuoteElement;

// Type for render element props with our custom element type
export type CustomRenderElementProps = RenderElementProps & {
  element: CustomElement;
};

// Render element component
export const RenderElement = (props: CustomRenderElementProps): ReactElement => {
  const { attributes, children, element } = props;

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
    case 'block-quote':
      return <blockquote {...attributes}>{children}</blockquote>;
    default:
      return <p {...attributes}>{children}</p>;
  }
};