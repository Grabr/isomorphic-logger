import type {Processor, Record} from '../types/ProcessorType';
import type {LoggerLogLevel} from '../types/LoggerType';
import {LogLevel} from '../LogLevel';
import StackTrace from 'stacktrace-js';

export type MessageTester = (message: *, level: LoggerLogLevel, i: number) => boolean;

export type StackTraceCreator = (errorType: string, errorMessage: string, stackFrames: StackFrame[]) => string;

export type StackFrame = {
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  functionName: string;
};

export type ErrorWrapperOptions = {
  trimHeadFrames: number;
  testMessage: MessageTester;
  createStackTrace: StackTraceCreator;
};

export function createErrorWrapper({
  trimHeadFrames = 0,
  testMessage = defaultTestMessage,
  createStackTrace = defaultCreateStackTrace
}: ErrorWrapperOptions = {}): Processor {
  return (records: Record[]) => records.map(({level, messages, ...props}) => {
    messages = [...messages];
    for (let i = 0; i < messages.length; ++i) {
      if (messages[i] instanceof Error || !testMessage(messages[i], level, i)) {
        continue;
      }
      const error = new Error(messages[i]);
      const stackFrames = StackTrace.getSync().slice(trimHeadFrames);
      error.stack = createStackTrace(error.name, error.message, stackFrames);
      messages[i] = error;
    }
    return {level, messages, ...props};
  })
}

export function defaultTestMessage(message: *, level: LoggerLogLevel, i: number): boolean {
  return level >= LogLevel.ERROR && i === 0;
}

export function defaultCreateStackTrace(errorType: string, errorMessage: string, stackFrames: StackFrame[]): string {
  const callStack = [];
  for (const {fileName, lineNumber, columnNumber, functionName} of stackFrames) {
    const path = `${fileName}:${lineNumber}:${columnNumber}`;
    callStack.push(functionName ? `at ${functionName} (${path})` : `at ${path}`);
  }
  return `${errorType}: ${errorMessage}\n${callStack.join('\n')}`;
}
