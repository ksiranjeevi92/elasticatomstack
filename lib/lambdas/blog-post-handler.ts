import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  APIGatewayClient,
  GetExportCommand,
} from "@aws-sdk/client-api-gateway";
import { v4 as uuid } from "uuid";
import { BlogPost } from "./blogPost";
import { BlogPostService } from "./BlogPostService";

const defaultHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const TABLE_NAME = process.env.TABLE_NAME!;
const blogPostService = new BlogPostService(TABLE_NAME);
export const createBlogPostHandler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const partialBlogPost = JSON.parse(event.body!) as {
    title: string;
    author: string;
    content: string;
  };
  const id = uuid();
  const createdAt = new Date().toISOString();

  const blogPost: BlogPost = {
    id: id,
    title: partialBlogPost.title,
    author: partialBlogPost.author,
    content: partialBlogPost.content,
    createdAt: createdAt,
  };
  await blogPostService.saveBlogPost(blogPost);
  return {
    statusCode: 201,
    body: JSON.stringify(blogPost),
    headers: defaultHeaders,
  };
};

export const getBlogPostsHandler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const order = event?.queryStringParameters?.order;
  let blogPosts = await blogPostService.getBlogPost();
  if (order === "asc") {
    // ORDER ASCENDING
    blogPosts = blogPosts.sort((blogPostA, blogPostB) =>
      blogPostA.createdAt.localeCompare(blogPostB.createdAt)
    );
  } else {
    // ORDER DESCENDING
    blogPosts = blogPosts.sort((blogPostA, blogPostB) =>
      blogPostB.createdAt.localeCompare(blogPostA.createdAt)
    );
  }
  return {
    statusCode: 200,
    body: JSON.stringify(blogPosts),
    headers: defaultHeaders,
  };
};

export const getBlogPostHandler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters!.id!;
  const blogPost = await blogPostService.getBlogPostById(id);
  return {
    statusCode: 200,
    body: JSON.stringify(blogPost),
    headers: defaultHeaders,
  };
};

export const deleteBlogPostHandler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters!.id!;
  await blogPostService.deleteBlogPostById(id);
  return {
    statusCode: 204,
    body: "",
    headers: defaultHeaders,
  };
};

export const apiDocsHandler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const ui = event?.queryStringParameters?.ui;
  const apigateway = new APIGatewayClient({});
  const restApiId = process.env.API_ID!;
  const getExportCommand = new GetExportCommand({
    restApiId: restApiId,
    exportType: "swagger",
    accepts: "application/json",
    stageName: "prod",
  });

  const api = await apigateway.send(getExportCommand);
  const response = Buffer.from(api.body!).toString("utf-8");

  if (!ui) {
    return {
      statusCode: 200,
      body: response,
      headers: defaultHeaders,
    };
  }

  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      name="description"
      content="SwaggerUI"
    />
    <title>SwaggerUI</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui.css" />
  </head>
  <body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: 'api-docs',
        dom_id: '#swagger-ui',
      });
    };
  </script>
  </body>
  </html>`;

  return {
    statusCode: 200,
    body: html,
    headers: {
      "Content-Type": "text/html",
    },
  };
};
