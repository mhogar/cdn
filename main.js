const util = require('util')
const fs = require('fs')
const pathUtil = require('path')
const eta = require('eta')

const readDir = util.promisify(fs.readdir)
const writeFile = util.promisify(fs.writeFile)
const fileStats = util.promisify(fs.stat)

// Set Eta's configuration
eta.configure({
    views: pathUtil.join(__dirname, 'templates')
})

const DIST_DIR = pathUtil.join(__dirname, 'dist')

async function renderDir(root, path) {
    const filenames = await readDir(pathUtil.join(DIST_DIR, path))

    // create a file info from each filename
    const fileInfos = 
        (await Promise.all(filenames.map(filename => createFileInfoAsync(root, path, filename))))
        .filter(x => x != null)
        .sort((a, b) => orderFileInfos(a, b))

    // render the index file
    await renderIndexFile(root, path, fileInfos)

    // recurse if directory
    await Promise.all(fileInfos.map(fileInfo => {
        if (fileInfo.isDir) {
            return renderDir(pathUtil.join('..', root), pathUtil.join(path, fileInfo.filename))
        }
    }))
}

async function createFileInfoAsync(root, path, filename) {
    // ignore temporary and index files, and the assets dir
    if (filename[0] == '.' || filename == 'index.html' || (root == '.' && filename == 'assets')) {
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

async function renderIndexFile(root, path, fileInfos) {
    const assetsDir = pathUtil.join(root, 'assets')
    const data = fileInfos.map(fileInfo => {
        return {
            name: fileInfo.filename,
            type: getFileType(fileInfo.filename),
            link: fileInfo.isDir ? pathUtil.join(path, fileInfo.filename, 'index.html') : pathUtil.join(path, fileInfo.filename)
        }
    })

    const result = await eta.renderFile('main', {
        icon: pathUtil.join(assetsDir, 'favicon.svg'),
        bootstrap: pathUtil.join(assetsDir, 'bootstrap.min.css'),
        path: path, 
        items: data 
    })
    await writeFile(pathUtil.join(DIST_DIR, path, 'index.html'), result)
}

function getFileType(filename) {
    const ext = pathUtil.extname(filename)
    switch (ext) {
        case '':
            return 'folder'
        case '.png':
        case '.jpg':
        case '.jpeg':
        case '.svg':
            return 'image'
        case '.txt':
            return 'text'
        default:
            return 'binary'
    }
}

// start at the root
renderDir('.', '/')
