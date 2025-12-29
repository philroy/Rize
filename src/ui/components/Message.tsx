import React from 'react';
import { Box, Text } from 'ink';

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  userName?: string;
}

export const Message: React.FC<MessageProps> = ({ role, content, userName }) => {
  const isUser = role === 'user';

  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={0}>
        <Text bold color={isUser ? 'cyan' : 'magenta'}>
          {isUser ? (userName || 'You') : 'Rize'}:
        </Text>
      </Box>
      <Box paddingLeft={2}>
        <Text color={isUser ? 'white' : 'magentaBright'}>{content}</Text>
      </Box>
    </Box>
  );
};
