#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ElasticAtomStack } from '../lib/elastic-atom-stack';

const app = new cdk.App();
new ElasticAtomStack(app, 'ElasticAtomStack');
