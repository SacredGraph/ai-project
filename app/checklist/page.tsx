'use client';

import { useState } from 'react';
import { Flex, Heading, Text, Button, Card, Box, TextField } from '@radix-ui/themes';
import SlateEditor from '../components/editor/slate-editor';
import { Descendant } from 'slate';

// Default initial content for the checklist editor
const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [
      { text: 'Add your checklist items here' }
    ]
  }
];

export default function ChecklistPage() {
  // Editor content state
  const [value, setValue] = useState<Descendant[]>(initialValue);
  
  // Checklist title state
  const [title, setTitle] = useState('Untitled Checklist');
  
  // Handle saving the checklist
  const handleSave = () => {
    console.log('Saving checklist:', {
      title,
      content: value
    });
    // Here you would implement actual saving logic
  };
  
  return (
    <Flex direction="column" gap="4" className="p-8">
      <Flex justify="between" align="center" className="mb-4">
        <Heading size="6">Create Checklist</Heading>
        <Flex gap="2">
          <Button variant="soft" color="gray">Cancel</Button>
          <Button onClick={handleSave}>Save Checklist</Button>
        </Flex>
      </Flex>
      
      <Card className="p-4 mb-4">
        <Flex direction="column" gap="2">
          <Text as="label" size="2" weight="bold">Title</Text>
          <TextField.Root 
            placeholder="Enter checklist title" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mb-2"
          />
          
          <Text as="label" size="2" weight="bold" className="mt-4">Items</Text>
          <Box className="border rounded-md p-2 min-h-[300px]">
            <SlateEditor 
              value={value} 
              onChange={setValue}
              readOnly={false}
            />
          </Box>
        </Flex>
      </Card>
      
      <Card className="p-4">
        <Flex direction="column" gap="2">
          <Text size="2" weight="bold">Tips</Text>
          <Text size="2">
            • Use the toolbar to format your checklist items
            • Add checklist items by using the checklist button in the toolbar
            • Rearrange items by dragging them
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}