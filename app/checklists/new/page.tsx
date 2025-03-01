'use client';

import React, { useState } from 'react';
import { Button, Flex, Card, Text, Heading, Box, TextField, TextArea } from '@radix-ui/themes';
import { ArrowLeftIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import SlateEditor from '../../components/editor/slate-editor';
import { Descendant } from 'slate';

export default function NewChecklistPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Initial value for the Slate editor
  const [editorValue, setEditorValue] = useState<Descendant[]>([
    {
      type: 'checklist-item',
      checked: false,
      children: [{ text: 'My first checklist item' }],
    },
    {
      type: 'checklist-item',
      checked: false,
      children: [{ text: 'Click to edit this item' }],
    },
    {
      type: 'checklist-item',
      checked: false,
      children: [{ text: 'Add more items as needed' }],
    },
  ]);

  const handleSave = () => {
    // In a real app, this would save to a database
    console.log({
      title,
      description,
      items: editorValue,
    });
    
    alert('Checklist saved! In a real app, this would persist the data.');
  };

  return (
    <Flex direction="column" className="min-h-screen p-8">
      <Box mb="4">
        <Link href="/">
          <Button variant="ghost" size="2">
            <ArrowLeftIcon /> Back to Home
          </Button>
        </Link>
      </Box>

      <Heading size="7" mb="4">Create New Checklist</Heading>
      
      <Card className="max-w-3xl w-full mx-auto">
        <Flex direction="column" gap="4" className="p-4">
          <Box>
            <Text as="label" size="2" weight="bold" htmlFor="title">
              Title
            </Text>
            <TextField.Root 
              size="3" 
              id="title"
              placeholder="Enter checklist title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Box>
          
          <Box>
            <Text as="label" size="2" weight="bold" htmlFor="description">
              Description (optional)
            </Text>
            <TextArea 
              size="3" 
              id="description"
              placeholder="Enter checklist description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Box>
          
          <Box>
            <Text as="label" size="2" weight="bold" mb="2" display="block">
              Checklist Items
            </Text>
            <Box className="border rounded-md p-2">
              <SlateEditor
                value={editorValue}
                onChange={setEditorValue}
                placeholder="Add checklist items..."
                className="min-h-[200px]"
              />
            </Box>
          </Box>
          
          <Flex gap="3" mt="4" justify="end">
            <Link href="/">
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Link>
            <Button onClick={handleSave}>
              <CheckCircledIcon />
              Save Checklist
            </Button>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}