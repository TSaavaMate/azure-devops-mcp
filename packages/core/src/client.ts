import { WebApi, getBearerHandler } from "azure-devops-node-api";

export interface AzureDevOpsClientOptions {
  organization: string;
  getToken: () => Promise<string>;
}

export class AzureDevOpsClient {
  public readonly orgUrl: string;
  private readonly getToken: () => Promise<string>;
  private connection: WebApi | null = null;

  constructor(options: AzureDevOpsClientOptions) {
    if (!options.organization) {
      throw new Error("Organization name is required");
    }
    this.orgUrl = `https://dev.azure.com/${options.organization}`;
    this.getToken = options.getToken;
  }

  async getConnection(): Promise<WebApi> {
    if (!this.connection) {
      const token = await this.getToken();
      const authHandler = getBearerHandler(token);
      this.connection = new WebApi(this.orgUrl, authHandler);
    }
    return this.connection;
  }
}
