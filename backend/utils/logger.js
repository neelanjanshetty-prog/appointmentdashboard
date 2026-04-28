const SENSITIVE_KEY_PATTERN = /(password|pass|secret|token|authorization|cookie|api[_-]?key|uri|url)/i;

const levels = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const getMinimumLevel = () => {
  const configuredLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");
  return levels[configuredLevel] || levels.info;
};

const redact = (value, seen = new WeakSet()) => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : redact(item, seen)
    ])
  );
};

const write = (level, message, meta = {}) => {
  if (levels[level] < getMinimumLevel()) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redact(meta)
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    process.stderr.write(`${line}\n`);
    return;
  }

  process.stdout.write(`${line}\n`);
};

const logger = {
  debug: (message, meta) => write("debug", message, meta),
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta)
};

module.exports = logger;
