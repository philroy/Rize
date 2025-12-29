import React from 'react';
import { Box, Text } from 'ink';

export const CommandHelp: React.FC = () => {
  return (
    <Box flexDirection="column" marginTop={1} paddingX={1} borderStyle="round" borderColor="gray">
      <Text bold color="yellow">
        Commands:
      </Text>
      <Box flexDirection="column" paddingLeft={2}>
        <Text dimColor>
          <Text color="green">/help</Text> - Show this help message
        </Text>
        <Text dimColor>
          <Text color="green">/tasks</Text> - View your tasks
        </Text>
        <Text dimColor>
          <Text color="green">/reminders</Text> - View your reminders
        </Text>
        <Text dimColor>
          <Text color="green">/clear</Text> - Clear the screen
        </Text>
        <Text dimColor>
          <Text color="green">/exit</Text> - Exit the application
        </Text>
      </Box>
    </Box>
  );
};
