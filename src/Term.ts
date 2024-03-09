import { exec } from '@actions/exec';
import hasYarn from 'has-yarn';
import hasPNPM from 'has-pnpm';
import fs from 'node:fs';
import path from 'node:path';

function hasBun(cwd = process.cwd()) {
  return fs.existsSync(path.resolve(cwd, 'bun.lockb'));
}

export class Term {
  /**
   * Autodetects and gets the current package manager for the current directory, either yarn, pnpm, bun,
   * or npm. Default is `npm`.
   *
   * @param directory The current directory
   * @returns The detected package manager in use, one of `yarn`, `pnpm`, `npm`, `bun`
   */
  getPackageManager(directory?: string): string {
    return hasYarn(directory)
      ? 'yarn'
      : hasPNPM(directory)
      ? 'pnpm'
      : hasBun(directory)
      ? 'bun'
      : 'npm';
  }

  async execSizeLimit(
    branch?: string,
    buildScript?: string,
    cleanScript?: string,
    directory?: string,
    packageManager?: string
  ): Promise<{ status: number; output: string }> {
    // 获取当前项目的包管理工具
    const manager = packageManager || this.getPackageManager(directory);
    // SizeLimit 执行结果
    let output = '';

    // 如果传入分支，需要切换到对应目标分支
    if (branch) {
      try {
        await exec(`git fetch origin ${branch} --depth=1`);
      } catch (error) {
        console.log('Fetch failed', (error as any).message);
      }

      await exec(`git checkout -f ${branch}`);
    }

    // 调用包管理工具安装当前项目
    await exec(`${manager} install`, [], {
      cwd: directory
    });

    // 运行构建命令，获得当前项目构建产物
    const script = buildScript || 'build';
    await exec(`${manager} run ${script}`, [], {
      cwd: directory
    });

    // 调用 size-limit --json 命令获得当前项目下 package.json 配置的 size-limit 文件执行后的信息
    const status = await exec('npx size-limit --json', [], {
      ignoreReturnCode: true,
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        }
      },

      cwd: directory
    });

    // 如果传入了 cleanScript，执行清空命令
    if (cleanScript) {
      await exec(`${manager} run ${cleanScript}`, [], {
        cwd: directory
      });
    }

    return {
      status,
      output
    };
  }
}
