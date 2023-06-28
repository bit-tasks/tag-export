import * as fs from 'fs';
import * as path from 'path';

export type ExecutionFunction = (command: string, options?: {cwd: string}) => Promise<number>;

const run: (exec: ExecutionFunction, wsdir: string) => Promise<void> = async (exec, wsdir) => {
  await exec('bit tag --persist', { cwd: wsdir });
  await exec('bit export', { cwd: wsdir });
}

export default run;
