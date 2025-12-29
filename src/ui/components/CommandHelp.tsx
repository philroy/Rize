import React from 'react';
import { Box, Text } from 'ink';

export const CommandHelp: React.FC = () => {
  return (
    <Box flexDirection="column" marginTop={1} paddingX={1} borderStyle="round" borderColor="gray">
      <Text bold color="yellow">
        Commands:
      </Text>
      <Box flexDirection="column" paddingLeft={2}>
        <Text bold color="cyan">Assistant:</Text>
        <Text dimColor>  <Text color="green">/tasks</Text> - View your tasks</Text>
        <Text dimColor>  <Text color="green">/addtask [desc]</Text> - Add a new task</Text>
        <Text dimColor>  <Text color="green">/completetask [#]</Text> - Complete a task</Text>
        <Text dimColor>  <Text color="green">/reminders</Text> - View reminders</Text>
        <Text dimColor>  <Text color="green">/addreminder [msg]</Text> - Add reminder</Text>

        <Box marginTop={1}>
          <Text bold color="magenta">Companion:</Text>
        </Box>
        <Text dimColor>  <Text color="green">/thought</Text> - Rize shares a thought</Text>
        <Text dimColor>  <Text color="green">/mood</Text> - Check Rize's mood</Text>
        <Text dimColor>  <Text color="green">/emotions</Text> - See emotional state</Text>
        <Text dimColor>  <Text color="green">/personality</Text> - View personality traits</Text>
        <Text dimColor>  <Text color="green">/consciousness</Text> - See thought stream</Text>

        <Box marginTop={1}>
          <Text bold color="blue">Sleep/Wake:</Text>
        </Box>
        <Text dimColor>  <Text color="green">/sleep</Text> - Enter sleep mode</Text>
        <Text dimColor>  <Text color="green">/wake</Text> - Wake up</Text>
        <Text dimColor>  <Text color="green">/dreams</Text> - View recent dreams</Text>

        <Box marginTop={1}>
          <Text bold color="yellow">Other:</Text>
        </Box>
        <Text dimColor>  <Text color="green">/research [topic]</Text> - Research a topic</Text>
        <Text dimColor>  <Text color="green">/autonomy</Text> - Check autonomy level</Text>
        <Text dimColor>  <Text color="green">/voice</Text> - Toggle voice mode</Text>
        <Text dimColor>  <Text color="green">/clear</Text> - Clear the screen</Text>
        <Text dimColor>  <Text color="green">/exit</Text> - Exit application</Text>
      </Box>
    </Box>
  );
};
