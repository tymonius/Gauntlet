import fs from "node:fs";

const homePath = "v0.6.3/index.html";
let home = fs.readFileSync(homePath, "utf8").replace(/\r\n/g, "\n");

if (!home.includes('href="rules-arbiter/"')) {
  home = home.replace(
    '<a href="reference/">Card reference</a><a href="changes/">Returning-player changes</a>',
    '<a href="reference/">Card reference</a><a href="rules-arbiter/">Candidate Rules Arbiter</a><a href="changes/">Returning-player changes</a>'
  );
}

home = home.replace(
  '<li>Rules Arbiter remains on the published v0.6.2 corpus until its own v0.6.3 propagation pass.</li>',
  '<li>The public Rules Arbiter remains on the published v0.6.2 corpus. A separate <a href="rules-arbiter/">v0.6.3 development Rules Arbiter</a> is available for candidate review.</li>'
);

if (!home.includes('href="rules-arbiter/"')) throw new Error("Could not link the v0.6.3 candidate Rules Arbiter from the development portal.");
fs.writeFileSync(homePath, home.replace(/\s+$/, "") + "\n", "utf8");
console.log("Linked the isolated v0.6.3 development Rules Arbiter from the candidate portal.");
