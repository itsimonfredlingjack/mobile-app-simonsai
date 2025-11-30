import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  FlatList,
  ViewStyle,
  TextStyle,
  Keyboard,
  Platform,
} from 'react-native';
import { useTheme, Theme } from '../contexts/ThemeContext';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  theme: Theme;
}

interface ChatHistoryProps {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface MessageSegment {
  type: 'text' | 'code';
  content: string;
}

const parseMarkdown = (content: string): MessageSegment[] => {
  const segments: MessageSegment[] = [];
  const codeBlockRegex = /```[\s\S]*?```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      });
    }

    // Add code block (remove backticks)
    const codeContent = match[0].replace(/^```\w*\n?/, '').replace(/```$/, '');
    segments.push({
      type: 'code',
      content: codeContent,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  return segments.length > 0 ? segments : [{ type: 'text', content }];
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ role, content, theme }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const segments = parseMarkdown(content);
  const isUser = role === 'user';

  // Theme-specific styles
  const isQwen = theme.name === 'QWEN';
  const borderRadius = isQwen ? 0 : 16;

  const containerStyle: ViewStyle = {
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    maxWidth: '80%',
    marginVertical: 8,
    marginHorizontal: 16,
  };

  // Bubble styling with better contrast and less padding
  const bubbleStyle: ViewStyle = isQwen
    ? {
        // QWEN theme
        backgroundColor: isUser ? 'rgba(0, 243, 255, 0.12)' : '#0d1a24',
        borderWidth: 1,
        borderColor: isUser ? 'rgba(0, 243, 255, 0.3)' : 'rgba(0, 243, 255, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 0,
      }
    : {
        // NERDY theme
        backgroundColor: isUser ? 'rgba(255, 174, 0, 0.15)' : '#2a2a2a',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
      };

  // Typography - QWEN always monospace
  const textStyle: TextStyle = isQwen
    ? {
        // QWEN text
        color: theme.colors.text,
        fontFamily: 'monospace',
        fontSize: 14,
        lineHeight: 20,
        letterSpacing: 0.3,
      }
    : {
        // NERDY text
        color: theme.colors.text,
        fontFamily: undefined, // System font
        fontSize: 15,
        lineHeight: 22, // More breathing room
      };

  const codeStyle: TextStyle = {
    color: theme.colors.text,
    fontFamily: 'monospace',
    fontSize: 13,
    backgroundColor: isUser
      ? `${theme.colors.accent}66` // Darker for code blocks
      : theme.colors.background,
    padding: 8,
    borderRadius: borderRadius > 0 ? 8 : 0,
    marginVertical: 4,
  };

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={bubbleStyle}>
        {segments.map((segment, index) => {
          if (segment.type === 'code') {
            return (
              <Text key={index} style={codeStyle}>
                {segment.content}
              </Text>
            );
          }
          return (
            <Text key={index} style={textStyle}>
              {segment.content}
            </Text>
          );
        })}
      </View>
    </Animated.View>
  );
};

export const ChatHistory: React.FC<ChatHistoryProps> = ({ messages }) => {
  const { theme } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  useEffect(() => {
    // Auto-scroll when keyboard appears
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const subscription = Keyboard.addListener(showEvent, () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    });
    return () => subscription.remove();
  }, []);

  const renderItem = ({ item }: { item: { role: 'user' | 'assistant'; content: string } }) => (
    <ChatBubble role={item.role} content={item.content} theme={theme} />
  );

  const keyExtractor = (item: { role: 'user' | 'assistant'; content: string }, index: number) =>
    `${item.role}-${index}`;

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 16,
    flexGrow: 1,
  },
});
