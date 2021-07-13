const util = require('util')
const fs = require('fs')
const pathUtil = require('path')
const eta = require('eta')

const readDir = util.promisify(fs.readdir)
const writeFile = util.promisify(fs.writeFile)

// Set Eta's configuration
eta.configure({
    views: __dirname
})

async function renderDir(path, dirname) {
    const filenames = await readDir(pathUtil.join(__dirname, 'dist', path))
    await renderIndexFile(path, dirname, filenames)
}

async function renderIndexFile(path, dirname, filenames) {
    const data = await eta.renderFile('template', { dirname: dirname, items: filenames })
    await writeFile(pathUtil.join(__dirname, 'dist', path, 'index.html'), data)
}

// start at the root
renderDir('/', 'root')
