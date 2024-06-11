import { CurrentUser } from '@gateway/controllers/auth/current-user';
import { Refresh } from '@gateway/controllers/auth/refresh-token';
import { authMiddleware } from '@gateway/services/auth-middleware';
import express, { Router } from 'express';

class CurrentUserRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.get('/auth/refresh-token/:username', authMiddleware.checkAuthentication, Refresh.prototype.token);
    this.router.get('/auth/currentuser', authMiddleware.checkAuthentication, CurrentUser.prototype.read);
    this.router.post('/auth/resend-email', authMiddleware.checkAuthentication, CurrentUser.prototype.resendEmail);
    return this.router;
  }
}

export const currentUserRoutes: CurrentUserRoutes = new CurrentUserRoutes();