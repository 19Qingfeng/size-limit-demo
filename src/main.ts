import { SizeLimit } from './SizeLimit';
import { Term } from './Term';
import { getInput } from './utils';
import { context, getOctokit } from '@actions/github';
import { setFailed } from '@actions/core';
import { markdownTable as table } from 'markdown-table';

const SIZE_LIMIT_HEADING = `## size-limit report 📦 `;

async function run() {
  const { payload, repo } = context;

  // 获取本次 pr 相关信息
  const pr = payload.pull_request;

  if (!pr) {
    throw new Error('No PR found. Only pull_request workflows are supported.');
  }

  const token = getInput('github_token');
  // const skipStep = getInput('skip_step');
  const buildScript = getInput('build_script');
  const cleanScript = getInput('clean_script');
  const packageManager = getInput('package_manager');
  const directory = getInput('directory') || process.cwd();

  // 初始化 github 客户端≠=
  const octokit = getOctokit(token);
  const term = new Term();

  // 当前提交分支下获取 size-limit 报告
  const { status, output } = await term.execSizeLimit(
    null,
    buildScript,
    cleanScript,
    directory,
    packageManager
  );
  // pr target 分支下获取 size-limit 报告
  const { output: baseOutput } = await term.execSizeLimit(
    pr.base.ref, // 需要切换到的目标分支
    buildScript,
    cleanScript,
    directory,
    packageManager
  );

  const limit = new SizeLimit();

  let base;
  let current;
  try {
    // 将 base 和 current 的报告格式化成为便于操作的 json object
    base = limit.parseResults(baseOutput);
    current = limit.parseResults(output);
  } catch (error) {
    console.log(
      'Error parsing size-limit output. The output should be a json.'
    );
    throw error;
  }

  const body = [
    SIZE_LIMIT_HEADING,
    // 生成 size-limit markdown table 形式的前后对比报告
    table(limit.formatResults(base, current))
  ].join('\r\n');

  // 获取当前 PR 下的所有评论
  const commentLists = await octokit.paginate(
    'GET /repos/:owner/:repo/issues/:issue_number/comments',
    {
      ...repo,
      issue_number: pr.number
    }
  );
  // 判断当前 PR 下所有评论内容是否包含 size-limit 报告
  const sizeLimitComment = commentLists.find((comment) =>
    (comment as any).body.startsWith(SIZE_LIMIT_HEADING)
  );

  const comment = !sizeLimitComment ? null : sizeLimitComment;

  if (!sizeLimitComment) {
    try {
      // 为 PR 关联的 issues 创建一条评论，内容为 size-limit 报告
      // 该条评论会同步在 PullRequest 下
      await octokit.rest.issues.createComment({
        ...repo,
        // eslint-disable-next-line camelcase
        issue_number: pr.number,
        body
      });
    } catch (error) {
      console.log(
        "Error creating comment. This can happen for PR's originating from a fork without write permissions."
      );
    }
  } else {
    try {
      // 为 PR 关联的 issues 更新 size-limit 评论内容
      await octokit.rest.issues.updateComment({
        ...repo,
        // eslint-disable-next-line camelcase
        comment_id: (comment as any).id,
        body
      });
    } catch (error) {
      console.log(
        "Error updating comment. This can happen for PR's originating from a fork without write permissions."
      );
    }
  }

  if (status > 0) {
    setFailed('Size limit has been exceeded.');
  }
}

run();
