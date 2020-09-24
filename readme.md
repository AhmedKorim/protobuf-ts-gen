<h2 align="center">ProtoBuf definitions for typescript</h2>
<div align="center">
  <strong>
     This make it easier to generate typescript types only without the real impaction of GRPC
  </strong>
</div>
<div align="center">
  <sub>
      ⚠ Still Under Constructions ⚠. will work find for basic sbuf i will add more road map you may find on the example folder a protobuf file and the
       generated output
  </sub>
</div>

## example

more example will add on the example folder

```javascript
const { CodeGen } = require("../dist/index");
const fs = require("fs");
const path = require("path");



/// load the protocol buffer from a file
// you may use load for async version
// for bio-directional connection you may tell the type of the message wrapper
// const codgen = CodeGen.loadSync(path.join(__dirname, "test.proto" ,"Observable")); // rxjs Observable
// const codgen = CodeGen.loadSync(path.join(__dirname, "test.proto" ,"Stream"));
const codgen = CodeGen.loadSync(path.join(__dirname, "test.proto"));
// this return the packages you have on the proto buf; here we take the first one
const firstPackageName = codgen.names[0]; // ["package-name"]
console.log(codgen.genType(firstPackageName, "EventMessage")); // log the type for a single <b>Message</b>
const stream = fs.createWriteStream(
  path.join(__dirname, "output", "protobuf-types.ts")
);


// the will return the full definition for the package
stream.write(codgen.genPackageDefinition(firstPackageName));
console.log(codgen.getService(firstPackageName, "Handshake"));
```
