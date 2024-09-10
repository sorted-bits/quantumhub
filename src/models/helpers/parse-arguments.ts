export const parseArguments = (args: string[]): string => {
  const configIndex = args.findIndex((arg) => arg.startsWith('--config'));
  if (configIndex === -1) {
    throw new Error('No config file provided');
  }

  return args[configIndex].split('=')[1];
};
