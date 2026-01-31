/**
 * Creates a PAT-based authenticator for Azure DevOps.
 * @param envVarName - Environment variable name containing the PAT (default: AZURE_DEVOPS_PAT)
 * @returns Async function that returns the PAT token
 */
export function createPatAuthenticator(envVarName: string = "AZURE_DEVOPS_PAT"): () => Promise<string> {
  return async () => {
    const token = process.env[envVarName];
    if (!token) {
      throw new Error(`Environment variable '${envVarName}' is not set or empty. ` + `Please set it with a valid Azure DevOps Personal Access Token.`);
    }
    return token;
  };
}
