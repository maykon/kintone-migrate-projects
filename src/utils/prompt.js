import * as readline from 'node:readline/promises';  // This uses the promise-based APIs
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });

export const prompt = {
  question: rl.question.bind(rl),
  close: rl.close.bind(rl),
};