/**
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { defineSecret, defineString } from "firebase-functions/params";

import { AuthenticatonType, Config } from "./types";

export const databaseParam = defineString("DATABASE", {
  label: "Firestore Instance ID",
  default: "(default)",
});

export const databaseRegionParam = defineString("DATABASE_REGION", {
  label: "Firestore Instance Location",
});

export const authTypeParam = defineString("AUTH_TYPE", {
  label: "Authentication Type",
  default: "UsernamePassword",
});

export const smtpConnectionUriParam = defineString("SMTP_CONNECTION_URI", {
  label: "SMTP connection URI",
});

export const smtpPasswordParam = defineSecret("SMTP_PASSWORD", {
  label: "SMTP password",
});

export const oauthHostParam = defineString("HOST", {
  label: "OAuth2 SMTP Host",
  default: "",
});

export const oauthPortParam = defineString("OAUTH_PORT", {
  label: "OAuth2 SMTP Port",
  default: "465",
});

export const oauthSecureParam = defineString("OAUTH_SECURE", {
  label: "Use secure OAuth2 connection?",
  default: "true",
});

export const oauthUserParam = defineString("USER", {
  label: "OAuth2 SMTP User",
  default: "",
});

export const mailCollectionParam = defineString("MAIL_COLLECTION", {
  label: "Email documents collection",
  default: "mail",
});

export const defaultFromParam = defineString("DEFAULT_FROM", {
  label: "Default FROM address",
});

export const defaultReplyToParam = defineString("DEFAULT_REPLY_TO", {
  label: "Default REPLY-TO address",
  default: "",
});

export const usersCollectionParam = defineString("USERS_COLLECTION", {
  label: "Users collection",
  default: "",
});

export const templatesCollectionParam = defineString("TEMPLATES_COLLECTION", {
  label: "Templates collection",
  default: "",
});

export const ttlExpireTypeParam = defineString("TTL_EXPIRE_TYPE", {
  label: "Firestore TTL type",
  default: "never",
});

export const ttlExpireValueParam = defineString("TTL_EXPIRE_VALUE", {
  label: "Firestore TTL value",
  default: "1",
});

export const tlsOptionsParam = defineString("TLS_OPTIONS", {
  label: "TLS Options",
  default: "{}",
});

const optionalString = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const config: Config = {
  location: process.env.LOCATION,
  database: process.env.DATABASE || "(default)",
  databaseRegion: process.env.DATABASE_REGION || "us-central1",
  mailCollection: process.env.MAIL_COLLECTION,
  smtpConnectionUri: process.env.SMTP_CONNECTION_URI,
  smtpPassword: process.env.SMTP_PASSWORD,
  defaultFrom: process.env.DEFAULT_FROM,
  defaultReplyTo: process.env.DEFAULT_REPLY_TO,
  usersCollection: process.env.USERS_COLLECTION,
  templatesCollection: process.env.TEMPLATES_COLLECTION,
  testing: process.env.TESTING === "true",
  TTLExpireType: process.env.TTL_EXPIRE_TYPE,
  TTLExpireValue: Number.parseInt(process.env.TTL_EXPIRE_VALUE || "1", 10),
  tls: process.env.TLS_OPTIONS || "{}",
  host: process.env.HOST,
  port: Number.parseInt(process.env.OAUTH_PORT || "465", 10),
  secure: process.env.OAUTH_SECURE === "true",
  user: process.env.USER,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  refreshToken: process.env.REFRESH_TOKEN,
  authenticationType: process.env.AUTH_TYPE as AuthenticatonType,
};

/**
 * Loads function-kit parameters at runtime.
 *
 * OAuth2 secret parameters are intentionally left on their legacy environment
 * variables because this project uses Username & Password authentication.
 * Optional extension secrets become required when declared as Functions
 * secrets, so declaring unused OAuth2 secrets would force unnecessary secrets
 * during deployment.
 *
 * @return {Config} Runtime configuration.
 */
export function applyRuntimeParams(): Config {
  config.database = databaseParam.value();
  config.databaseRegion = databaseRegionParam.value();
  config.authenticationType =
    authTypeParam.value() as AuthenticatonType;
  config.smtpConnectionUri = optionalString(smtpConnectionUriParam.value());
  config.smtpPassword = smtpPasswordParam.value();
  config.host = optionalString(oauthHostParam.value());
  config.port = Number.parseInt(oauthPortParam.value(), 10);
  config.secure = oauthSecureParam.value() === "true";
  config.user = optionalString(oauthUserParam.value());
  config.mailCollection = mailCollectionParam.value();
  config.defaultFrom = defaultFromParam.value();
  config.defaultReplyTo = optionalString(defaultReplyToParam.value());
  config.usersCollection = optionalString(usersCollectionParam.value());
  config.templatesCollection = optionalString(templatesCollectionParam.value());
  config.TTLExpireType = ttlExpireTypeParam.value();
  config.TTLExpireValue = Number.parseInt(ttlExpireValueParam.value(), 10);
  config.tls = tlsOptionsParam.value() || "{}";

  return config;
}

export default config;
