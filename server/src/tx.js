let queue = Promise.resolve();

async function withMutex(fn) {
  const prev = queue;
  let release;
  queue = new Promise((r) => {
    release = r;
  });
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

export async function withTransaction(db, fn) {
  return withMutex(async () => {
    await db.exec("BEGIN IMMEDIATE");
    try {
      const result = await fn();
      await db.exec("COMMIT");
      return result;
    } catch (e) {
      try {
        await db.exec("ROLLBACK");
      } catch {
        // ignore rollback error
      }
      throw e;
    }
  });
}

