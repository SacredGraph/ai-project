import React, { useState, useMemo } from 'react';
import { createEditor, Descendant, Range } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import { RenderElement } from './elements';
import { RenderLeaf } from './utils';
import Toolbar from './toolbar';
import { CustomElement } from './types';
import './editor.css';

export interface SlateEditorProps {
  value: Descendant[];
  onChange: (value: Descendant[]) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  toolbarClassName?: string;
}

const SlateEditor: React.FC<SlateEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  placeholder = 'Type something...',
  className = '',
  toolbarClassName = '',
}) => {
  // Unused variable removed
  // const initialHtml = '<p>Hello World</p>';
  
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [selection, setSelection] = useState<Range | null>(null);

  return (
    <div className={`slate-editor ${className}`}>
      <Slate
        editor={editor}
        initialValue={value}
        onChange={(newValue) => {
          onChange(newValue);
          setSelection(editor.selection);
        }}
      >
        {!readOnly && (
          <Toolbar 
            className={toolbarClassName} 
            selection={selection}
          />
        )}
        <Editable
          readOnly={readOnly}
          placeholder={placeholder}
          renderElement={(props) => {
            // Cast the element as CustomElement to make TypeScript happy
            const elementType = (props.element as Partial<CustomElement>).type || 'paragraph';
            
            // This is a type assertion to tell TypeScript the type is valid
            const type = elementType as CustomElement['type'];
            
            return RenderElement({
              ...props,
              element: {
                ...props.element,
                type
              } as CustomElement
            });
          }}
          renderLeaf={RenderLeaf}
        />
      </Slate>
    </div>
  );
};

export default SlateEditor;