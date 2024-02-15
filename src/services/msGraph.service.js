import BaseError from '../utils/base.error.js';
import { prompt } from '../utils/prompt.js';
import fs from 'fs/promises';

export default class MsGraphService {
  static #msRedirectUri = 'https://login.live.com/oauth20_desktop.srf';
  static #msGraphAuthUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/'
  static #msGraphUrl = 'https://graph.microsoft.com/v1.0/';
  static #msScopes = 'openid offline_access User.Read Files.ReadWrite.All';

  #msClientId;
  #msClientSecret;
  #msCode;
  #msAccessToken;
  #msRefreshToken;
  #sharepointFolder;
  #isDebug;

  constructor({ client, secret, sharepointFolder, debug }) {
    if (!client) {
      throw new BaseError('⚠️ The Microsoft APP ClientID is required!');
    }
    if (!secret) {
      throw new BaseError('⚠️ The Microsoft APP ClientSecret is required!');
    }

    this.#msClientId = client;
    this.#msClientSecret = secret;
    this.#sharepointFolder = sharepointFolder || 'me/drive/root';
    this.#isDebug = debug || process.env.MS_GRAPH_DEBUG === 'true';
    this.logout();
  }

  #generateAuthorizeRequest() {
    return `${MsGraphService.#msGraphAuthUrl}authorize?client_id=${this.#msClientId}&response_type=code&redirect_uri=${MsGraphService.#msRedirectUri}&response_mode=query&scope=${encodeURIComponent(MsGraphService.#msScopes)}&state=12345`;
  }

  #debug(path, message) {
    if (this.#isDebug) {
      console.debug(`\n⚠️  ${path}`);
      console.debug(message);
      console.debug();
    }
  }

  #debugResponse(path, response) {
    const { status, statusText, body } = response;
    return this.#debug(path, { status, statusText, body });
  }

  async #requestAuthorizationToken(token, grant_type = 'authorization_code') {
    const tokenKey = grant_type === 'refresh_token' ? grant_type : 'code';
    try {
      const body = new FormData();
      body.append('client_id', this.#msClientId);
      body.append('client_secret', this.#msClientSecret);
      body.append('scope', MsGraphService.#msScopes);
      body.append('redirect_uri', MsGraphService.#msRedirectUri);
      body.append('grant_type', grant_type);
      body.append(tokenKey, token);

      const authorization = await fetch(`${MsGraphService.#msGraphAuthUrl}token`, {
          method: 'POST',
          'Content-Type': 'application/x-www-url-form-urlencoded',
          body,
        }).then((r) => {
          this.#debugResponse('RequestAuthorizationToken', r);
          return r.json();
        });
      if (authorization.error) {
        this.#debug('RequestAuthorizationToken', authorization.error);
        throw new BaseError(authorization.error?.message || 'Error in get authorization token');
      }
      this.#debug('RequestAuthorizationToken', authorization);
      this.#setAuthorizationTokens(authorization);
      return authorization;
    } catch (error) {
      this.#debug('RequestAuthorizationToken', error);
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
    const info = await fetch(`${MsGraphService.#msGraphUrl}me`, {
      headers: {
        'Authorization': `Bearer ${this.#msAccessToken}`,
      }
    }).then((r) => {
      this.#debugResponse('GetMyInfo', r);
      return r.json();
    });
    if (info.error) {
      this.#debug('GetMyInfo', info.error);
      throw new BaseError('Error in get my information');
    }
  }

  async #renewTokenWithNeeded() {
    try {
      await this.#getMyInfo();
    } catch (_) {
      try {
        const authorization = await this.#requestAuthorizationToken(this.#msRefreshToken, 'refresh_token')
          .then((r) => {
            this.#debugResponse('RenewTokenWithNeeded', r);
            return r.json();
          });
        this.#debug('RenewTokenWithNeeded', authorization);
      } catch (error) {
        this.#debug('RenewTokenWithNeeded', error);
        throw new BaseError('Cannot renew the current token, please try login again!');
      }
    }
  }

  async #requestGraphApi(url, method, body, headers = {}, debug) {
    await this.#renewTokenWithNeeded();
    const response = await fetch(`${MsGraphService.#msGraphUrl}${url}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.#msAccessToken}`,
          ...headers,
        },
        body,
      }).then(async (r) => {
        if (debug) {
          const text = await r.text();
          this.#debug('RequestGraphApi', { url, text });
        }
        this.#debugResponse('RequestGraphApi', r);
        return r.json();
      });
    this.#debug('RequestGraphApi', response);
    if (response.error) {      
      this.#debug('RequestGraphApi', { url, error: response.error });
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

  async requestGraphPut(url, body, headers, debug) {
    return this.#requestGraphApi(url, 'PUT', body, headers, debug);
  }

  async requestGraphDelete(url, body, headers) {
    return this.#requestGraphApi(url, 'DELETE', body, headers);
  }

  async uploadFile(attachmentDir, folderName, file) {
    const fileName = file.split('/').at(-1);
    const urlFile = this.#sharepointFolder.concat(`:/${folderName}/${encodeURIComponent(fileName)}:/content`);
    try {
      const fileContent = await fs.readFile(attachmentDir.concat(`/${file}`));
      const response = await this.requestGraphPut(urlFile, fileContent);
      if (response.error) {
        this.#debug('UploadFile', response.error);
        throw new BaseError(response.error?.message || 'Error in upload file');
      }
      return response;
    } catch (error) {
      this.#debug('UploadFile', { urlFile, error });
      throw new BaseError(`Cannot upload a new file in ${urlFile}`);
    }    
  }

  async signIn() {
    const authorizeUrl = this.#generateAuthorizeRequest();
    console.info('💡 Sharepoint Authentication step\n');
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