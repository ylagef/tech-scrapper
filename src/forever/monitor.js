var forever = require('forever-monitor')
const { exec } = require('child_process')
const util = require('util')
const execPromise = util.promisify(exec)

var child = new forever.Monitor('dist/index.js', {
  uid: 'tech-scrapper',
  append: true,
  watch: true,
  watchDirectory: 'src',
  outFile: './log/out.log',
  errFile: './log/err.log',
  killSignal: 'SIGTERM'
})

child.on('start', (info) => {
  console.log(`🤖 MONITOR - Started ${info.uid}!`)
})

child.on('watch:restart', (info) => {
  console.log(
    '🤖 MONITOR - Restarting script because ' + info.file + ' changed'
  )
  child.stop()
})

child.on('exit:code', async (code) => {
  console.log('🤖 MONITOR - Forever detected script exited with code ' + code)

  try {
    console.log('🤖 MONITOR - Building...')

    // Wait until build before start
    const res = await execPromise('npm run build')
    console.log(res.stderr)
    console.log(`🤖 MONITOR - 🟢 Build successful`)
  } catch (error) {
    console.error('🤖 MONITOR - 🔴 Error building...')
  }

  child.start()
})

child.on('stop', (info) => {
  console.log(`🤖 MONITOR - Stopped ${info.uid}!`)
})

child.start()
