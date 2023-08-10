import * as xyz from "@pulumi/vco";

const random = new xyz.Random("my-random", { length: 24 });

export const output = random.result;