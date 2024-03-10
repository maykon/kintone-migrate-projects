import { fork } from 'node:child_process';
import path from 'path';

let loadingBar;

export default {
  loadingBarStart: async () => {
    loadingBar = fork(path.resolve('src/utils/cli/loadingBar.js'));
    loadingBar.unref();
    await new Promise((resolve) => setTimeout(resolve, 500));
  },
  loadingBarStop: async () => {    
    loadingBar?.send('stop');
    loadingBar?.kill();
    loadingBar = null;
    process.stdout.cursorTo(0, process.stdout.rows);
    process.stdout.clearLine();
    await new Promise((resolve) => setTimeout(resolve, 250));
  },
  moveToStartRow: () => {
    process.stdout.cursorTo(0, process.stdout.rows);
  },
};