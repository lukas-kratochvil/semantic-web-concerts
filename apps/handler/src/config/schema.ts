import type { ArrayToUnion } from "@semantic-web-concerts/shared/src/utils";
import Joi from "joi";

const ALLOWED_NODE_ENVS = ["development", "production"] as const;
type NodeEnv = ArrayToUnion<typeof ALLOWED_NODE_ENVS>;

export type ConfigSchema = {
  nodeEnv: NodeEnv;
  port: number;
  redis: {
    host: string;
    port: number;
  };
};

export const configSchema = Joi.object<ConfigSchema, true>({
  nodeEnv: Joi.string()
    .trim()
    .valid(...ALLOWED_NODE_ENVS)
    .required(),
  port: Joi.number().port().required(),
  redis: Joi.object<ConfigSchema["redis"], true>({
    host: Joi.string().trim().required(),
    port: Joi.number().port().required(),
  }),
});
