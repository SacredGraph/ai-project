import { Editor, Transforms, Element as SlateElement } from 'slate';
import { RenderLeafProps } from 'slate-react';
import { CustomText, ElementType, CustomElement } from './types';
import React, { ReactElement } from 'react';

// Type for custom leaf props
interface CustomRenderLeafProps extends RenderLeafProps {
  leaf: CustomText;
}

// Is the mark active?
export const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor);
  // We need to use a type assertion here to tell TypeScript that we know what we're doing
  return marks ? (marks as Record<string, boolean>)[format] === true : false;
};

// Toggle mark
export const toggleMark = (editor: Editor, format: string) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

// Shortcut functions for common marks
export const toggleBold = (editor: Editor) => toggleMark(editor, 'bold');
export const toggleItalic = (editor: Editor) => toggleMark(editor, 'italic');
export const toggleUnderline = (editor: Editor) => toggleMark(editor, 'underline');
export const toggleCode = (editor: Editor) => toggleMark(editor, 'code');

// Check if a block is active
export const isBlockActive = (
  editor: Editor, 
  format: string,
  attributes: Record<string, unknown> = {}
) => {
  const { selection } = editor;
  if (!selection) return false;

  // Get the nodes at the current selection
  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) => {
        if (!Editor.isEditor(n) && SlateElement.isElement(n)) {
          // Need to cast through unknown first to avoid TypeScript errors
          const element = n as unknown as { type?: string } & Record<string, unknown>;
          if (element.type === format) {
            // Check if all attributes match
            if (Object.keys(attributes).length === 0) return true;
            
            // Only check attributes if there are any to check
            return Object.entries(attributes).every(([key, value]) => 
              element[key] === value
            );
          }
        }
        return false;
      }
    })
  );

  return !!match;
};

// Toggle a block type
export const toggleBlock = (
  editor: Editor, 
  format: string,
  attributes: Record<string, unknown> = {}
) => {
  const isActive = isBlockActive(editor, format, attributes);
  const isList = ['bulleted-list', 'numbered-list'].includes(format);

  // Unwrap any list items if needed
  Transforms.unwrapNodes(editor, {
    match: (n) => {
      if (!Editor.isEditor(n) && SlateElement.isElement(n)) {
        // Need to cast through unknown first to avoid TypeScript errors
        const element = n as unknown as { type?: string };
        if (element.type && ['bulleted-list', 'numbered-list'].includes(element.type)) {
          return true;
        }
      }
      return false;
    },
    split: true,
  });

  // We need to use a more flexible type here
  const newProperties: Record<string, unknown> = {
    type: isActive ? 'paragraph' : isList ? 'list-item' : format,
    ...Object.fromEntries(
      Object.entries(attributes).map(([key, value]) => [key, isActive ? null : value])
    ),
  };

  Transforms.setNodes(editor, newProperties);

  // Wrap in list if needed
  if (!isActive && isList) {
    const block: CustomElement = { 
      type: format as ElementType, 
      children: [] 
    };
    Transforms.wrapNodes(editor, block);
  }
};

// Shortcut functions for blocks
export const toggleHeadingOne = (editor: Editor) => toggleBlock(editor, 'heading-one');
export const toggleHeadingTwo = (editor: Editor) => toggleBlock(editor, 'heading-two');
export const toggleHeadingThree = (editor: Editor) => toggleBlock(editor, 'heading-three');
export const toggleList = (editor: Editor, format: 'bulleted-list' | 'numbered-list') => 
  toggleBlock(editor, format);
export const toggleBlockQuote = (editor: Editor) => toggleBlock(editor, 'block-quote');

// Toggle checklist item
export const toggleChecklistItem = (editor: Editor) => {
  const isActive = isBlockActive(editor, 'checklist-item');
  
  // Unwrap any list items if needed
  Transforms.unwrapNodes(editor, {
    match: (n) => {
      if (!Editor.isEditor(n) && SlateElement.isElement(n)) {
        const element = n as unknown as { type?: string };
        if (element.type && ['bulleted-list', 'numbered-list'].includes(element.type)) {
          return true;
        }
      }
      return false;
    },
    split: true,
  });

  const newProperties: Record<string, unknown> = {
    type: isActive ? 'paragraph' : 'checklist-item',
    checked: isActive ? undefined : false,
  };

  Transforms.setNodes(editor, newProperties);
};

// Leaf rendering
export const RenderLeaf = (props: CustomRenderLeafProps): ReactElement => {
  const { attributes, children, leaf } = props;
  
  // JSX would be cleaner, but as we can't use JSX in a .ts file
  // We need to do this the long way
  return (
    <span {...attributes}>
      {leaf.bold ? (
        <strong>
          {leaf.italic ? (
            <em>
              {leaf.underline ? (
                <u>
                  {leaf.code ? <code>{children}</code> : children}
                </u>
              ) : leaf.code ? (
                <code>{children}</code>
              ) : (
                children
              )}
            </em>
          ) : leaf.underline ? (
            <u>
              {leaf.code ? <code>{children}</code> : children}
            </u>
          ) : leaf.code ? (
            <code>{children}</code>
          ) : (
            children
          )}
        </strong>
      ) : leaf.italic ? (
        <em>
          {leaf.underline ? (
            <u>
              {leaf.code ? <code>{children}</code> : children}
            </u>
          ) : leaf.code ? (
            <code>{children}</code>
          ) : (
            children
          )}
        </em>
      ) : leaf.underline ? (
        <u>
          {leaf.code ? <code>{children}</code> : children}
        </u>
      ) : leaf.code ? (
        <code>{children}</code>
      ) : (
        children
      )}
    </span>
  );
};