import {
  aws_lambda_nodejs,
  aws_apigateway,
  aws_dynamodb,
  aws_route53,
  aws_certificatemanager,
  aws_route53_targets,
  aws_iam,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class ElasticAtomStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /**
     * Api gateway
     */
    const api = new aws_apigateway.RestApi(this, "blogPostApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: aws_apigateway.Cors.ALL_ORIGINS,
        allowMethods: aws_apigateway.Cors.ALL_METHODS,
        allowHeaders: aws_apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    /**
     * custom domain using route53
     */
    const domainName = "api.example.com";
    const hostedZone = aws_route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: "example.com",
    });

    const certificate = new aws_certificatemanager.Certificate(
      this,
      "certificate",
      {
        domainName: domainName,
        validation:
          aws_certificatemanager.CertificateValidation.fromDns(hostedZone),
      }
    );

    const customDomain = new aws_apigateway.DomainName(this, "CustomDomain", {
      domainName: domainName,
      certificate: certificate,
    });

    customDomain.addBasePathMapping(api);

    new aws_route53.ARecord(this, "apiRecord", {
      zone: hostedZone,
      recordName: domainName,
      target: aws_route53.RecordTarget.fromAlias(
        new aws_route53_targets.ApiGatewayDomain(customDomain)
      ),
    });

    /**
     * Dynamodb
     */
    const table = new aws_dynamodb.Table(this, "blogPostTable", {
      tableName: "blogPostTable",
      partitionKey: { name: "id", type: aws_dynamodb.AttributeType.STRING },
    });

    /**
     * Swagger
     */
    const apiDocsLambdaName = "apiDocsHandler";
    const apiDocsLambda = new aws_lambda_nodejs.NodejsFunction(
      this,
      apiDocsLambdaName,
      {
        entry: "lib/lambdas/blog-post-handler.ts",
        handler: apiDocsLambdaName,
        functionName: apiDocsLambdaName,
        environment: { API_ID: api.restApiId },
      }
    );

    const policy = new aws_iam.PolicyStatement({
      actions: ["apigateway:GET"],
      resources: ["*"],
    });
    apiDocsLambda.role?.addToPrincipalPolicy(policy);

    const apiDocsPath = api.root.addResource("api-docs");
    apiDocsPath.addMethod(
      "GET",
      new aws_apigateway.LambdaIntegration(apiDocsLambda),
      {
        requestParameters: {
          "method.request.querystring.ui": false,
        },
      }
    );

    /**
     * Lambda for create blog post
     */
    const createBlogPostLambdaName = "createBlogPostHandler";
    const createBlogPostLambda = new aws_lambda_nodejs.NodejsFunction(
      this,
      createBlogPostLambdaName,
      {
        entry: "./lib/lambdas/blog-post-handler.ts",
        handler: createBlogPostLambdaName,
        functionName: createBlogPostLambdaName,
        environment: { TABLE_NAME: table.tableName },
      }
    );
    table.grantWriteData(createBlogPostLambda);

    /**
     * Lambda for get all blog post
     */
    const getBlogPostsLambdaName: string = "getBlogPostsHandler";
    const getBlogPostsLambda = new aws_lambda_nodejs.NodejsFunction(
      this,
      getBlogPostsLambdaName,
      {
        entry: "./lib/lambdas/blog-post-handler.ts",
        handler: getBlogPostsLambdaName,
        functionName: getBlogPostsLambdaName,
        environment: { TABLE_NAME: table.tableName },
      }
    );

    table.grantReadData(getBlogPostsLambda);

    /**
     * Lambda for get blog post by id
     */
    const getBlogPostLambdaName: string = "getBlogPostHandler";

    const getBlogPostLambda = new aws_lambda_nodejs.NodejsFunction(
      this,
      getBlogPostLambdaName,
      {
        entry: "./lib/lambdas/blog-post-handler.ts",
        handler: getBlogPostLambdaName,
        functionName: getBlogPostLambdaName,
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );

    table.grantReadData(getBlogPostLambda);

    /**
     * Lambda for delete blog post by id
     */
    const deleteBlogPostLambdaName: string = "deleteBlogPostHandler";

    const deleteBlogPostLambda = new aws_lambda_nodejs.NodejsFunction(
      this,
      deleteBlogPostLambdaName,
      {
        entry: "./lib/lambdas/blog-post-handler.ts",
        handler: deleteBlogPostLambdaName,
        functionName: deleteBlogPostLambdaName,
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );

    table.grantWriteData(deleteBlogPostLambda);

    /**
     * Api gate way path
     */

    const blogPostPath = api.root.addResource("blogposts");

    blogPostPath.addMethod(
      "POST",
      new aws_apigateway.LambdaIntegration(createBlogPostLambda)
    );

    blogPostPath.addMethod(
      "GET",
      new aws_apigateway.LambdaIntegration(getBlogPostsLambda),
      {
        requestParameters: {
          "method.request.querystring.order": false,
        },
      }
    );

    const getBlogPostByIdPath = blogPostPath.addResource("{id}");

    getBlogPostByIdPath.addMethod(
      "GET",
      new aws_apigateway.LambdaIntegration(getBlogPostLambda)
    );

    getBlogPostByIdPath.addMethod(
      "DELETE",
      new aws_apigateway.LambdaIntegration(deleteBlogPostLambda)
    );
  }
}
