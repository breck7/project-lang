const fs = require("fs")
const jtree = require("jtree")
const TreeNode = jtree.TreeNode

class projectProgram extends jtree.program {
  getOrderedDependenciesArray() {
    const cloned = this.clone()
    const sorted = []
    const included = {}
    let lastLength
    while (cloned.length) {
      if (lastLength === cloned.length) {
        cloned.getChildren().forEach(file => {
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

  static _getRequiredFiles(str) {
    const regex = /(\n|^)const .* \= require\("([^"]+)"\)/g
    const regex2 = /"(.+)"/
    const matches = str.match(regex)
    if (!matches) return []
    return matches.map(match => match.match(regex2)[1]).map(file => {
      let type = "external"
      if (file.startsWith(".")) type = "relative"
      else if (file.startsWith("/")) type = "absolute"
      return `${type} ${file}`
    })
  }

  static getProjectProgram(arrayOfScriptPaths) {
    const files = new TreeNode(arrayOfScriptPaths.join("\n"))
    const required = new TreeNode()
    files.getChildren().forEach(child => {
      const line = child.getLine()
      const content = fs.readFileSync(line, "utf8")
      const requiredFiles = this._getRequiredFiles(content)
      required.append(`file ${line}`, requiredFiles.length ? requiredFiles.join("\n") : undefined)
    })
    return required.toString()
  }
}

module.exports = projectProgram
