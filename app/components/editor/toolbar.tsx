import React from 'react';
import { useSlate } from 'slate-react';
import { Range } from 'slate';
import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleCode,
  toggleHeadingOne,
  toggleHeadingTwo,
  toggleHeadingThree,
  toggleList,
  toggleBlockQuote,
  toggleChecklistItem,
  isMarkActive,
  isBlockActive
} from './utils';

interface ToolbarButtonProps {
  format: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
}

interface ToolbarProps {
  className?: string;
  selection: Range | null;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ 
  format, 
  icon, 
  onClick, 
  isActive = false 
}) => {
  return (
    <button
      type="button"
      className={`toolbar-button ${isActive ? 'active' : ''}`}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      data-format={format}
    >
      {icon}
    </button>
  );
};

const Toolbar: React.FC<ToolbarProps> = ({ className = '', selection }) => {
  const editor = useSlate();
  
  // Don't render the toolbar if there's no selection
  if (!selection) return null;

  return (
    <div className={`toolbar ${className}`}>
      <ToolbarButton
        format="bold"
        icon="B"
        onClick={() => toggleBold(editor)}
        isActive={isMarkActive(editor, 'bold')}
      />
      <ToolbarButton
        format="italic"
        icon="I"
        onClick={() => toggleItalic(editor)}
        isActive={isMarkActive(editor, 'italic')}
      />
      <ToolbarButton
        format="underline"
        icon="U"
        onClick={() => toggleUnderline(editor)}
        isActive={isMarkActive(editor, 'underline')}
      />
      <ToolbarButton
        format="code"
        icon="<>"
        onClick={() => toggleCode(editor)}
        isActive={isMarkActive(editor, 'code')}
      />
      <span className="toolbar-divider" />
      <ToolbarButton
        format="heading-one"
        icon="H1"
        onClick={() => toggleHeadingOne(editor)}
        isActive={isBlockActive(editor, 'heading-one')}
      />
      <ToolbarButton
        format="heading-two"
        icon="H2"
        onClick={() => toggleHeadingTwo(editor)}
        isActive={isBlockActive(editor, 'heading-two')}
      />
      <ToolbarButton
        format="heading-three"
        icon="H3"
        onClick={() => toggleHeadingThree(editor)}
        isActive={isBlockActive(editor, 'heading-three')}
      />
      <span className="toolbar-divider" />
      <ToolbarButton
        format="bulleted-list"
        icon="•"
        onClick={() => toggleList(editor, 'bulleted-list')}
        isActive={isBlockActive(editor, 'bulleted-list')}
      />
      <ToolbarButton
        format="numbered-list"
        icon="#"
        onClick={() => toggleList(editor, 'numbered-list')}
        isActive={isBlockActive(editor, 'numbered-list')}
      />
      <ToolbarButton
        format="block-quote"
        icon="❝"
        onClick={() => toggleBlockQuote(editor)}
        isActive={isBlockActive(editor, 'block-quote')}
      />
      <span className="toolbar-divider" />
      <ToolbarButton
        format="checklist-item"
        icon="✓"
        onClick={() => toggleChecklistItem(editor)}
        isActive={isBlockActive(editor, 'checklist-item')}
      />
    </div>
  );
};

export default Toolbar;