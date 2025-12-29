import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  userName?: string;
}

export const Header: React.FC<HeaderProps> = ({ userName }) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box borderStyle="round" borderColor="magenta" paddingX={2} paddingY={0}>
        <Text bold color="magenta">
          ◆ Rize Kamishiro - AI Companion ◆
        </Text>
      </Box>
      {userName && (
        <Box marginTop={1}>
          <Text dimColor>
            Connected: <Text color="cyan">{userName}</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
};
