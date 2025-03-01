import Image from "next/image";
import { Button, Flex, Card, Text, Heading, Box, Tabs, Badge, Tooltip } from '@radix-ui/themes';
import { InfoCircledIcon, MoonIcon, SunIcon } from '@radix-ui/react-icons';

export default function Home() {
  return (
    <Flex direction="column" align="center" justify="center" className="min-h-screen p-8">
      <Heading size="7" className="mb-8">Hello world with Radix UI!</Heading>
      
      <Card className="mb-8 max-w-md">
        <Flex direction="column" gap="4" align="center">
          <Image
            src="/next.svg"
            alt="Next.js logo"
            width={180}
            height={38}
            priority
            className="rounded-lg dark:invert"
          />
          
          <Tabs.Root defaultValue="image">
            <Tabs.List>
              <Tabs.Trigger value="image">Random Image</Tabs.Trigger>
              <Tabs.Trigger value="info">Info</Tabs.Trigger>
            </Tabs.List>
            
            <Tabs.Content value="image">
              <Box className="p-4">
                <Image 
                  src="https://picsum.photos/300/300"
                  alt="Random image from picsum.photos"
                  width={300}
                  height={300}
                  className="rounded-md shadow-md"
                />
                <Text as="p" size="2" color="gray" className="mt-2 text-center">
                  A random beautiful image!
                </Text>
              </Box>
            </Tabs.Content>
            
            <Tabs.Content value="info">
              <Box className="p-4">
                <Text as="p" size="2">
                  This app demonstrates the integration of Radix UI with Next.js and Tailwind CSS.
                  The theme automatically adapts to your system preferences.
                </Text>
                
                <Flex gap="2" mt="4">
                  <Badge color="blue" variant="soft">
                    <Flex gap="1" align="center">
                      <SunIcon />
                      Light Mode
                    </Flex>
                  </Badge>
                  
                  <Badge color="gray" variant="soft">
                    <Flex gap="1" align="center">
                      <MoonIcon />
                      Dark Mode
                    </Flex>
                  </Badge>
                </Flex>
              </Box>
            </Tabs.Content>
          </Tabs.Root>
        </Flex>
      </Card>
      
      <Tooltip content="Click to send an email">
        <Button size="3" variant="solid" asChild>
          <a href="mailto:maxim@sacredgraph.com?subject=Hello%20from%20AI">
            <Flex gap="1" align="center">
              <InfoCircledIcon />
              Contact Me
            </Flex>
          </a>
        </Button>
      </Tooltip>
    </Flex>
  );
}