import process from 'process';

let loadingBar;

process.on('message', (_) => {
  loadingBar?.stop();
});

export default class LoadingBar {
  #barSize = 3;

  constructor(size) {
      this.size = size || 24;
      this.cursor = 0;
      this.timer = null;
      this.stopped = true;
      this.dir = 1;
  }

  #moveToLeft() {
    clearTimeout(this.timer);
    this.cursor = this.size - this.#barSize;
    this.timer = setInterval(() => {
      if (this.stopped) {
        clearInterval(this.timer);
        return;
      }
      this.#moveCursorToStart();
      const lastLoad = this.size - this.cursor - this.#barSize;
      if (this.cursor >= this.#barSize) {
        process.stdout.write("\u2591".repeat(this.cursor));
      }
      process.stdout.write("\u2588".repeat(this.#barSize));
      if (lastLoad >= this.#barSize) {
        process.stdout.write("\u2591".repeat(lastLoad));
      }
      this.cursor -= this.#barSize;
      if (this.cursor < 0) {
        clearInterval(this.timer);
        this.#moveToRight();
      }
    }, 100);
  }

  #moveToRight() {
    clearTimeout(this.timer);
    this.cursor = 0;
    this.timer = setInterval(() => {
      if (this.stopped) {
        clearInterval(this.timer);
        return;
      }
      this.#moveCursorToStart();      
      const lastLoad = this.size - this.cursor - this.#barSize;
      if (this.cursor >= this.#barSize) {
        process.stdout.write("\u2591".repeat(this.cursor));
      }
      process.stdout.write("\u2588".repeat(this.#barSize));
      if (lastLoad > this.#barSize) {
        process.stdout.write("\u2591".repeat(lastLoad));
      }
      this.cursor += this.#barSize;
      if (this.cursor >= this.size) {
        clearInterval(this.timer);
        this.#moveToLeft();
      }
    }, 100);
  }

  #moveCursorToStart() {
    process.stdout.cursorTo(0, process.stdout.rows);
  }

  async #run() {
    this.stopped = false;
    this.#moveCursorToStart();
    process.stdout.write("\x1B[?25l")
    process.stdout.write("\u2591".repeat(this.size));
    this.#moveToRight();
  }

  start() {
    this.#run();
  }

  stop() {
    clearTimeout(this.timer);
    this.cursor = 0;
    this.stopped = true;
    this.#moveCursorToStart();
    process.stdout.clearLine();
    loadingBar = null;
  }
}

loadingBar = new LoadingBar(24);
loadingBar.start();