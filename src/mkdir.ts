import path from "path";
import fs from "fs";
export const mkdir = (filePath: string) => {
  var dir = path.dirname(filePath);
  if (fs.existsSync(dir)) return true;
  mkdir(dir);
  fs.mkdirSync(dir);
};
