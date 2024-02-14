import { spawnSync } from 'node:child_process';

export const spawn = async (program, args, opts) => {
  const result = await spawnSync(program, args, opts);
  const { status, stdout, error, stderr } = result;
  if (status == null) {
    console.error('⚠️ Spawn Error: ', error);
    throw Error(error);
  } else if (status >= 1) {
    console.error('⚠️ Spawn Error: ', stderr?.toString());
    throw Error(stderr?.toString());
  }
  return stdout?.toString();
};