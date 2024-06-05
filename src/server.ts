import http from 'http';

import { CustomError, IErrorResponse, winstonLogger } from '@vineetthutheja/joblancer-shared';
import cookieSession from 'cookie-session';
import { Application, NextFunction, Request, Response, json, urlencoded } from 'express';
import hpp from 'hpp';
import cors from 'cors';
import helmet from 'helmet';
import { Logger } from 'winston';
import compression from 'compression';
import { StatusCodes } from 'http-status-codes';
import { config } from '@gateway/config';
import { elasticSearch } from '@gateway/elasticsearch';
import { appRoutes } from '@gateway/routes';
const SERVER_PORT = 4000;
const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'Gateway server', 'debug');

export class GatewayServer {
  private app: Application;
  constructor(app: Application) {
    this.app = app;
  }

  public start(): void {
    this.securityMiddleware(this.app);
    this.standardMiddleware(this.app);
    this.errorHandler(this.app);
    this.startServer(this.app);
    this.routesMiddleware(this.app);
    this.startElasticSearch();
  }

  private securityMiddleware(app: Application): void {
    app.set('trust proxy', 1);
    app.use(
      cookieSession({
        name: 'session',
        keys: [`${config.SECRET_KEY_ONE}`, `${config.SECRET_KEY_TWO}`],
        maxAge: 24 * 7 * 3600000,
        secure: config.NODE_ENV !== 'development'
      })
    );
    app.use(hpp());
    app.use(helmet());
    app.use(
      cors({
        origin: config.CLIENT_URL,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
      })
    );
  }

  private standardMiddleware(app: Application): void {
    app.use(compression());
    app.use(json({ limit: '200mb' }));
    app.use(urlencoded({ extended: true, limit: '200mb' }));
  }
  private startElasticSearch(): void {
    elasticSearch.checkConnection();
  }
  private routesMiddleware(app: Application): void{
    appRoutes(app);
  }
  private errorHandler(app: Application): void {
    app.use('*', (req: Request, res: Response, next: NextFunction) => {
      const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      log.log('error', `${fullUrl} endpoint does not exist.`, '');
      res.status(StatusCodes.NOT_FOUND).json({ message: 'The endpoint called does not exist.' });
      next();
    });
    app.use((error: IErrorResponse, _req: Request, res: Response, next: NextFunction): void => {
      if (error instanceof CustomError) {
        log.log('error', `GatewayService ${error.comingFrom}:`, error);
        res.status(error.statusCode).json(error.serializeError());
      }
      next();
    });
  }

  private async startServer(app: Application): Promise<void>{
    try {
        const httpServer: http.Server = new http.Server(app);
        this.startHttpServer(httpServer);
    } catch (error) {
        log.log('error','Gateway service startServer() error method:', error);
    }
  }

  private async startHttpServer(httpServer: http.Server): Promise<void>{
    try {
        log.info(`Gateway server has started with process id ${process.pid}`);
        httpServer.listen(SERVER_PORT, () => {
          log.info(`Gateway server running on port ${SERVER_PORT}`);
        });
      } catch (error) {
        log.log('error', 'GatewayService startServer() error method:', error);
      }
  }
}
