import { applyIPO } from "./pkg/functions.js";

console.log("Started service");

await applyIPO();
setInterval(applyIPO, 1000 * 60 * 60 * 24);
