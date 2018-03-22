import path from 'path'
import { getInstallations } from 'testcafe-browser-tools'
import { execSync, spawn } from 'child_process'
import fetch from 'isomorphic-fetch'

import assignConfigPaths from './assign_config_paths'
import setup from './setup'

const testCafeRunner = async argv => {
  execSync(
    `node ` +
      path.resolve(__dirname, '../../bin/resolve-scripts.js') +
      ' build' +
      ' --test',
    { stdio: 'inherit' }
  )

  const { resolveConfig, deployOptions } = setup(argv, process.env)

  assignConfigPaths(resolveConfig)

  const TIMEOUT = 20000

  const browsers = await getInstallations()

  const browser = argv.browser || Object.keys(browsers).slice(0, 1)

  const application = spawn(
    'node',
    [`${resolveConfig.distDir}/server/server.js`],
    { stdio: 'inherit' }
  )

  while (true) {
    try {
      const response = await fetch(
        `${deployOptions.protocol}://${deployOptions.host}:${
          deployOptions.port
        }/api/status`
      )
      if ((await response.text()) === 'ok') break
    } catch (e) {}
  }

  const testcafe = spawn(
    'npx',
    [
      'testcafe',
      browser,
      'test/functional',
      `--app-init-delay ${TIMEOUT}`,
      `--selector-timeout ${TIMEOUT}`,
      `--assertion-timeout ${TIMEOUT}`,
      `--page-load-timeout ${TIMEOUT}`,
      ...(browser === 'remote' ? ['--qr-code'] : [])
    ],
    { stdio: 'inherit' }
  )
  testcafe.on('close', exitCode => {
    application.kill('SIGINT')
    process.exit(exitCode)
  })
}

export default testCafeRunner
