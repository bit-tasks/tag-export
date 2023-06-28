
export type ExecFunction = (command: string, options?: {cwd: string}) => Promise<number>;

const run: (exec: ExecFunction, wsdir: string) => Promise<void> = async (exec, wsdir) => {
  await exec('bit tag --persist', { cwd: wsdir });
  await exec('bit export', { cwd: wsdir });
}

export default run;
