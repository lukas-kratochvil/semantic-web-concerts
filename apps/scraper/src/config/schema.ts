import { ALLOWED_NODE_ENVS, type NodeEnv } from "@semantic-web-concerts/core";
import Joi from "joi";

export type ConfigSchema = {
  nodeEnv: NodeEnv;
  port: number;
  ticketmaster: {
    url: string;
    apiKey: string;
  };
  goout: {
    url: string;
  };
  ticketportal: {
    url: string;
  };
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
  ticketmaster: Joi.object<ConfigSchema["ticketmaster"], true>({
    url: Joi.string().trim().uri({ scheme: "https" }).required(),
    apiKey: Joi.string().trim().required(),
  }),
  goout: Joi.object<ConfigSchema["goout"], true>({
    url: Joi.string().trim().uri({ scheme: "https" }).required(),
  }),
  ticketportal: Joi.object<ConfigSchema["ticketportal"], true>({
    url: Joi.string().trim().uri({ scheme: "https" }).required(),
  }),
  redis: Joi.object<ConfigSchema["redis"], true>({
    host: Joi.string().trim().required(),
    port: Joi.number().port().required(),
  }),
});
