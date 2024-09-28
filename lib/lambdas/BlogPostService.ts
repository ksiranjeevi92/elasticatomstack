import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
  GetItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { BlogPost } from "./blogPost";

export class BlogPostService {
  private dynamo: DynamoDBClient;
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.dynamo = new DynamoDBClient({});
  }

  async saveBlogPost(blogPost: BlogPost): Promise<void> {
    const params = {
      TableName: this.tableName,
      Item: marshall(blogPost),
    };

    const command = new PutItemCommand(params);
    await this.dynamo.send(command);
  }
  async getBlogPost(): Promise<BlogPost[]> {
    const params = {
      TableName: this.tableName,
    };

    const command = new ScanCommand(params);
    const response = await this.dynamo.send(command);
    const items = response.Items ?? [];
    return items.map((item) => unmarshall(item) as BlogPost);
  }

  async getBlogPostById(id: string): Promise<BlogPost | null> {
    const params = {
      TableName: this.tableName,
      Key: marshall({ id: id }),
    };
    const command = new GetItemCommand(params);
    const response = await this.dynamo.send(command);
    const item = response.Item;
    if (!item) {
      return null;
    } else {
      return unmarshall(item) as BlogPost;
    }
  }

  async deleteBlogPostById(id: string): Promise<string | null> {
    const params = {
      TableName: this.tableName,
      Key: marshall({ id: id }),
    };
    const command = new DeleteItemCommand(params);
    const response = await this.dynamo.send(command);
    return id;
  }
}
