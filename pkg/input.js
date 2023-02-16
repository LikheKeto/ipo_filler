import YAML from "yaml";
import fs from "fs";

/**
 *
 * @param {string} path
 * @returns {{accounts:{boid:string,password:string,crn:string,dp:string,pin:string}[],kitta:int,timeout:int,retries:int,sendmail:boolean,usermail:string}}
 */
export const loadConfigurations = (path) => {
  const file = fs.readFileSync(path, "utf-8");
  let res = YAML.parse(file);
  res.version = null;
  let ret = {};
  Object.keys(res).forEach((key) => {
    if (key !== "version") {
      ret[key] = res[key];
    }
  });
  return ret;
};
