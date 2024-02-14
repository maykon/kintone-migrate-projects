export default class BaseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BaseError';
    if (process.env.NODE_ENV === 'production') {
      this.stack = null;
    }
  }
}