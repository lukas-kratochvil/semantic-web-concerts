import Joi from "joi";
import type { ArrayToUnion } from "@semantic-web-concerts/shared/utils";

const ALLOWED_NODE_ENVS = ["development", "production"] as const;
type NodeEnv = ArrayToUnion<typeof ALLOWED_NODE_ENVS>;

export type ConfigSchema = {
  nodeEnv: NodeEnv;
  port: number;
  ticketmaster: {
    url: string;
    apiKey: string;
  };
};

export const configSchema = Joi.object<ConfigSchema, true>({
  nodeEnv: Joi.string()
    .trim()
    .valid(...ALLOWED_NODE_ENVS)
    .required(),
  port: Joi.number().port().required(),
  ticketmaster: Joi.object<ConfigSchema["ticketmaster"], true>({
    url: Joi.string().trim().uri({ scheme: "https" }).required(),
    apiKey: Joi.string().trim().required(),
  }),
});
