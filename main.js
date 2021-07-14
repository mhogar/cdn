const util = require('util')
const fs = require('fs')
const pathUtil = require('path')
const eta = require('eta')

const readDir = util.promisify(fs.readdir)
const writeFile = util.promisify(fs.writeFile)
const fileStats = util.promisify(fs.stat)

// Set Eta's configuration
eta.configure({
    views: __dirname
})

const DIST_DIR = pathUtil.join(__dirname, 'dist')

async function renderDir(path) {
    const filenames = await readDir(pathUtil.join(DIST_DIR, path))

    // create a file info from each filename
    const fileInfos = 
        (await Promise.all(filenames.map(filename => createFileInfoAsync(path, filename))))
        .filter(x => x != null)
        .sort((a, b) => orderFileInfos(a, b))

    // render the index file
    await renderIndexFile(path, fileInfos)

    // recurse if directory
    await Promise.all(fileInfos.map(fileInfo => {
        if (fileInfo.isDir) {
            return renderDir(pathUtil.join(path, fileInfo.filename))
        }
    }))
}

async function createFileInfoAsync(path, filename) {
    // ignore temporary and index files
    if (filename[0] == '.' || filename == 'index.html') {
        return null
    }
    const stats = await fileStats(pathUtil.join(DIST_DIR, path, filename))

    return {
        filename: filename,
        isDir: stats.isDirectory()
    }
}

function orderFileInfos(a, b) {
    if (a.isDir && b.isDir) {
        return 0
    }
    if (a.isDir) {
        return -1
    }
    return 1
}

async function renderIndexFile(path, fileInfos) {
    const data = fileInfos.map(fileInfo => {
        return {
            name: fileInfo.filename,
            isDir: fileInfo.isDir,
            link: fileInfo.isDir ? pathUtil.join(path, fileInfo.filename, 'index.html') : pathUtil.join(path, fileInfo.filename)
        }
    })

    const result = await eta.renderFile('template', {
        path: path, 
        items: data 
    })
    await writeFile(pathUtil.join(DIST_DIR, path, 'index.html'), result)
}

// start at the root
renderDir('/', 'root')
