import BaseError from '../utils/base.error.js';
import { prompt } from '../utils/prompt.js';
import fs from 'fs/promises';

export default class MsGraphService {
  #msClientId;
  #msClientSecret;
  #msScopes;
  #msRedirectUri;
  #msCode;
  #msAccessToken;
  #msRefreshToken;
  #msGraphAuthUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/'
  #msGraphUrl = 'https://graph.microsoft.com/v1.0/';
  #sharepointFolder;
  #isDebug;

  constructor({ client, secret, scopes, redirectUri, sharepointFolder, debug }) {
    if (!client) {
      throw new BaseError('⚠️ The Microsoft APP ClientID is required!');
    }
    if (!secret) {
      throw new BaseError('⚠️ The Microsoft APP ClientSecret is required!');
    }

    this.#msClientId = client;
    this.#msClientSecret = secret;
    this.#msScopes = scopes;
    this.#msRedirectUri = redirectUri;
    this.#sharepointFolder = sharepointFolder || 'me/drive/root';
    this.#isDebug = debug || false;
    this.logout();
  }

  #generateAuthorizeRequest() {
    return `${this.#msGraphAuthUrl}authorize?client_id=${this.#msClientId}&response_type=code&redirect_uri=${this.#msRedirectUri}&response_mode=query&scope=${encodeURIComponent(this.#msScopes)}&state=12345`;
  }

  #debug(path, message) {
    if (this.#isDebug) {
      console.debug(`\n⚠️ ${path}`);
      console.debug(message);
      console.debug();
    }
  }

  async #requestAuthorizationToken(token, grant_type = 'authorization_code') {
    const tokenKey = grant_type === 'refresh_token' ? grant_type : 'code';
    try {
      const body = new FormData();
      body.append('client_id', this.#msClientId);
      body.append('client_secret', this.#msClientSecret);
      body.append('scope', this.#msScopes);
      body.append('redirect_uri', this.#msRedirectUri);
      body.append('grant_type', grant_type);
      body.append(tokenKey, token);

      const authorization = await fetch(`${this.#msGraphAuthUrl}token`, {
          method: 'POST',
          'Content-Type': 'application/x-www-url-form-urlencoded',
          body,
        }).then((r) => r.json());
      if (authorization.error) {
        console.error('⚠️ ', authorization.error);
        throw new BaseError(authorization.error?.message || 'Error in get authorization token');
      }
      this.#debug('RequestAuthorizationToken', authorization);
      this.#setAuthorizationTokens(authorization);
      return authorization;
    } catch (error) {
      console.error('⚠️ ', error);
      throw new BaseError(`Cannot get the Sharepoint authorization ${tokenKey}`);
    }    
  }

  get sharepointFolder() {
    return this.#sharepointFolder;
  }

  #setAuthorizationTokens(authorization) {
    this.#msAccessToken = authorization.access_token;
    this.#msRefreshToken = authorization.refresh_token;
  }

  async #getMyInfo() {
    const info = await fetch(`${this.#msGraphUrl}me`, {
      headers: {
        'Authorization': `Bearer ${this.#msAccessToken}`,
      }
    }).then((r) => r.json());
    if (info.error) {
      throw new BaseError('Error in get my information');
    }
  }

  async #renewTokenWithNeeded() {
    try {
      await this.#getMyInfo();
    } catch (_) {
      try {
        const authorization = await this.#requestAuthorizationToken(this.#msRefreshToken, 'refresh_token')
          .then((r) => r.json());
        this.#debug('RenewTokenWithNeeded', authorization);
      } catch (error) {
        console.error('⚠️ ', error);
        throw new BaseError('Cannot renew the current token, please try login again!');
      }
    }
  }

  async #requestGraphApi(url, method, body, headers = {}) {
    await this.#renewTokenWithNeeded();
    const response = await fetch(`${this.#msGraphUrl}${url}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.#msAccessToken}`,
          ...headers,
        },
        body,
      }).then((r) => r.json());
    this.#debug('RequestGraphApi', response);
    if (response.error) {
      console.error('⚠️ ', response);
      throw new BaseError(`Error in request [${method}]: ${url}`);
    }
    return response;
  }

  async requestGraphGet(url, headers) {
    return this.#requestGraphApi(url, 'GET', headers);
  }

  async requestGraphPost(url, body, headers) {
    return this.#requestGraphApi(url, 'POST', body, headers);
  }

  async requestGraphPut(url, body, headers) {
    return this.#requestGraphApi(url, 'PUT', body, headers);
  }

  async requestGraphDelete(url, body, headers) {
    return this.#requestGraphApi(url, 'DELETE', body, headers);
  }

  async uploadFile(attachmentDir, folderName, file) {
    const fileName = file.split('/').at(-1);
    const urlFile = this.#sharepointFolder.concat(`:/${folderName}/${fileName}:/content`);
    try {
      const fileContent = await fs.readFile(attachmentDir.concat(`/${file}`));
      const response = await this.requestGraphPut(encodeURIComponent(urlFile), fileContent);
      if (response.error) {
        throw new BaseError(response.error?.message || 'Error in upload file');
      }
      return response;
    } catch (error) {
      throw new BaseError(`Cannot upload a new file in ${urlFile}`);
    }    
  }

  async signIn() {
    const authorizeUrl = this.#generateAuthorizeRequest();
    console.info('💡 Sharepoint Authentication step\n')
    this.#msCode = await prompt.question(`📢 Please open the following URL in your browser and follow the steps until you see a blank page:
${authorizeUrl}
    
When ready, please enter the value of the code parameter (from the URL of the blank page) and press return...\n`);
    prompt.close();
    console.log();
    await this.#requestAuthorizationToken(this.#msCode);
  }

  logout() {
    this.#msCode = null;
    this.#msAccessToken = null;
    this.#msRefreshToken = null;
  }
}