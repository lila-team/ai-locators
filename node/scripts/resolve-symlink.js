const fs = require('fs');
const path = require('path');

function resolveSymlink(sourcePath) {
  // Read the symlink target
  const targetPath = fs.readlinkSync(sourcePath);
  const resolvedTargetPath = path.resolve(path.dirname(sourcePath), targetPath);

  // Create new filename with 'compiled_' prefix
  const dir = path.dirname(sourcePath);
  const filename = path.basename(sourcePath);
  const newPath = path.join(dir, `compiled_${filename}`);

  // Copy the actual file contents to the new file
  fs.copyFileSync(resolvedTargetPath, newPath);
  console.log(`Created compiled file ${newPath} from symlink ${sourcePath} -> ${resolvedTargetPath}`);
}

resolveSymlink("assets/selector.js")
