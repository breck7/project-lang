const fs = require("fs")
const jtree = require("jtree")
const TreeNode = jtree.TreeNode
const BrowserScript = require("./BrowserScript")

class projectProgram extends jtree.program {
  getOrderedDependenciesArray() {
    const cloned = this.clone()
    const sorted = []
    const included = {}
    let lastLength
    while (cloned.length) {
      if (lastLength === cloned.length) {
        cloned.forEach(file => {
          console.log(`'${file.getLine()}' is missing '${file.getMissingDependencies(included).join(",")}'`)
        })
        throw new Error(
          `Circular dependency or other error detected with ${cloned.length} remaining. ${cloned.toString()}`
        )
      }
      lastLength = cloned.length
      for (let index = 0; index < cloned.length; index++) {
        const file = cloned.nodeAt(index)
        const missingDependencies = file.getMissingDependencies(included)
        if (missingDependencies.length === 0) {
          const path = file.getFilePath()
          cloned.nodeAt(index).destroy()
          sorted.push(path)
          included[path] = true
          break
        }
      }
    }
    return sorted
  }

  static _extractImports(sourceCode, regex) {
    const matches = sourceCode.match(regex)
    if (!matches) return []
    const regex2 = /"(.+)"/
    return matches.map(match => match.match(regex2)[1])
  }

  static _getImportsCommonJs(sourceCode) {
    return this._extractImports(sourceCode, /(\n|^)const .* \= require\("([^"]+)"\)/g)
  }

  static _getImportsTypescript(sourceCode) {
    return this._extractImports(sourceCode, /(\n|^)import .* from "([^"]+)"/g)
  }

  static getImports(sourceCode) {
    const files = this._getImportsCommonJs(sourceCode).concat(this._getImportsTypescript(sourceCode))
    return files.map(file => {
      let type = "external"
      if (file.startsWith(".")) type = "relative"
      else if (file.startsWith("/")) type = "absolute"
      return `${type} ${file}`
    })
  }

  static getProjectProgram(arrayOfScriptPaths) {
    const files = new TreeNode(arrayOfScriptPaths.join("\n"))
    const requiredFileList = new TreeNode()
    files.forEach(child => {
      const line = child.getLine()
      const requiredFiles = this.getImports(fs.readFileSync(line, "utf8"))
      requiredFileList.appendLineAndChildren(
        `file ${line}`,
        requiredFiles.length ? requiredFiles.join("\n") : undefined
      )
    })
    return requiredFileList.toString()
  }
}

projectProgram.BrowserScript = BrowserScript

module.exports = projectProgram
