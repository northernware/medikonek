// @ts-check
import { module } from "@prisma/composer";
import { postgres, dataContract } from "@prisma/composer-prisma-cloud/orm";
import medikonekContractJson from "./src/prisma/contract.json" with { type: "json" };
import medikonekService from "./service.mjs";

export default module("medikonek", ({ provision }) => {
  const database = provision(postgres({ name: "database", contract: dataContract(medikonekContractJson), config: "./prisma.config.ts" }));
  provision(medikonekService, { deps: { db: database } });
});
