#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ElasticAtomStack } from "../lib/elastic-atom-stack";

const app = new cdk.App();
const region = "us-east-1";
const account = "018904738859";
new ElasticAtomStack(app, "ElasticAtomStack", {
  env: {
    region,
    account,
  },
});
