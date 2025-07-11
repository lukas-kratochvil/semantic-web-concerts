import { readFileSync } from "fs";
import { load as loadYaml } from "js-yaml";
import { configSchema } from "./schema";

const load = (): Record<string, unknown> => {
  const configYaml = loadYaml(readFileSync("config.yaml", "utf8")) as Record<string, unknown>;
  const config = {
    ...configYaml,
    nodeEnv: process.env["NODE_ENV"],
    port: process.env["PORT"],
  };
  const { error } = configSchema.validate(config, {
    allowUnknown: false,
    abortEarly: false,
    debug: process.env["NODE_ENV"] === "development",
  });

  if (error) {
    throw Error(`Config validation error: ${error.message}`);
  }

  return config;
};

export default load;
