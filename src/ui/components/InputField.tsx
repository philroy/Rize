import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface InputFieldProps {
  onSubmit: (value: string) => void;
  isProcessing: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({ onSubmit, isProcessing }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (val: string) => {
    if (val.trim() && !isProcessing) {
      onSubmit(val.trim());
      setValue('');
    }
  };

  return (
    <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
      <Text color="cyan" bold>
        {isProcessing ? '...' : '> '}
      </Text>
      {!isProcessing && (
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder="Type your message..."
        />
      )}
      {isProcessing && (
        <Text dimColor italic>
          Rize is thinking...
        </Text>
      )}
    </Box>
  );
};
