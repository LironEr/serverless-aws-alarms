import { spawn } from 'node:child_process';
import killProcess from 'tree-kill';

interface RunCMDOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutSeconds?: number;
}

export async function runCMD({ command, args = [], cwd = '.', env = {}, timeoutSeconds }: RunCMDOptions) {
  console.log(`Running command: "${command}" args: ${args.join(' ')} cwd: ${cwd} env: ${JSON.stringify(env)}`);

  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      cwd,
      env: {
        ...process.env,
        ...env,
      },
    });

    let timeoutTimer: NodeJS.Timeout | undefined = undefined;

    if (timeoutSeconds) {
      timeoutTimer = setTimeout(() => {
        if (!child.killed) {
          console.error('Command timed out, killing process');
          killProcess(child.pid!);
        }
      }, timeoutSeconds * 1000);
    }

    child.stdout?.on('data', (data) => {
      process.stdout.write(`\n${data}$ `);
    });

    child.stderr?.on('data', (data) => {
      process.stderr.write(`\n${data}$ `);
    });

    child.on('close', (code, signal) => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code: ${code} signal: ${signal}`));
      }
    });
  });
}
