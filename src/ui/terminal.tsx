import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { Header } from './components/Header.js';
import { Message } from './components/Message.js';
import { InputField } from './components/InputField.js';
import { CommandHelp } from './components/CommandHelp.js';

interface TerminalProps {
  onMessage: (message: string) => Promise<string>;
  onCommand: (command: string, args: string[]) => Promise<string | void>;
  initialGreeting: string;
  userName?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id: number;
}

export const Terminal: React.FC<TerminalProps> = ({
  onMessage,
  onCommand,
  initialGreeting,
  userName,
}) => {
  const { exit } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: initialGreeting, id: 0 },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [messageIdCounter, setMessageIdCounter] = useState(1);

  // Handle Ctrl+C to exit
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
  });

  const handleUserInput = async (input: string) => {
    // Check if it's a command
    if (input.startsWith('/')) {
      const parts = input.slice(1).split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      // Handle built-in commands
      if (command === 'help') {
        setShowHelp(!showHelp);
        return;
      }

      if (command === 'clear') {
        setMessages([]);
        return;
      }

      if (command === 'exit' || command === 'quit') {
        exit();
        return;
      }

      // Handle custom commands
      const response = await onCommand(command, args);
      if (response) {
        const newMessage: ChatMessage = {
          role: 'assistant',
          content: response,
          id: messageIdCounter,
        };
        setMessages((prev) => [...prev, newMessage]);
        setMessageIdCounter((prev) => prev + 1);
      }
      return;
    }

    // Regular message
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      id: messageIdCounter,
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessageIdCounter((prev) => prev + 1);
    setIsProcessing(true);

    try {
      const response = await onMessage(input);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        id: messageIdCounter + 1,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setMessageIdCounter((prev) => prev + 2);
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        id: messageIdCounter + 1,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setMessageIdCounter((prev) => prev + 2);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Header userName={userName} />

      {showHelp && <CommandHelp />}

      <Box flexDirection="column" marginY={1}>
        {messages.map((msg) => (
          <Message
            key={msg.id}
            role={msg.role}
            content={msg.content}
            userName={userName}
          />
        ))}
        {isProcessing && (
          <Box>
            <Text color="magenta">
              <Spinner type="dots" />
            </Text>
            <Text dimColor italic>
              {' '}
              Rize is thinking...
            </Text>
          </Box>
        )}
      </Box>

      <InputField onSubmit={handleUserInput} isProcessing={isProcessing} />

      <Box marginTop={1}>
        <Text dimColor>
          Type <Text color="green">/help</Text> for commands | <Text color="green">Ctrl+C</Text> to
          exit
        </Text>
      </Box>
    </Box>
  );
};
