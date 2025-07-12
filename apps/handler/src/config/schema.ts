import { ALLOWED_NODE_ENVS, type NodeEnv } from "@semantic-web-concerts/core";
import Joi from "joi";

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
