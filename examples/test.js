const { CodeGen } = require("../dist/index");
const fs = require("fs");
const path = require("path");
const codgen = CodeGen.loadSync(path.join(__dirname, "test.proto"));
const firstPackageName = codgen.names[0];
console.log(codgen.genType(firstPackageName, "EventMessage"));
const stream = fs.createWriteStream(
  path.join(__dirname, "output", "protobuf-types.ts")
);
stream.write(codgen.genPackageDefinition(firstPackageName));
console.log(codgen.getService(firstPackageName, "Handshake"));
