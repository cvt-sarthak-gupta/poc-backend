import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { Router } from 'express';
import logger from '../infrastructure/logger';

class ApiRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
  }

  public async initializeRoutes() {
    const basePath = dirname(__dirname);
    const files = this.getFilesRecursively(basePath);

    const extension = __filename.endsWith('.ts') ? 'ts' : 'js';

    for (const file of files) {
      if (file.endsWith(`routes.${extension}`)) {
        try {
          const module = await import(file);
          if (module.default) {
            const routesInstance = new module.default();
            this.router.use(routesInstance.router);
          }
        } catch (error) {
          logger.error({ file, err: error }, 'Failed to load routes — check this file for export errors');
          throw error;
        }
      }
    }
  }

  private getFilesRecursively(dir: string): string[] {
    let results: string[] = [];
    const list = readdirSync(dir, { withFileTypes: true });

    for (const file of list) {
      const fullPath = join(dir, file.name);

      if (file.isDirectory() && (file.name === 'common' || file.name === 'routes')) {
        continue;
      }

      if (file.isDirectory()) {
        results = results.concat(this.getFilesRecursively(fullPath));
      } else {
        results.push(fullPath);
      }
    }
    return results;
  }
}

const apiRoutesInstance = new ApiRoutes();
export default apiRoutesInstance.router;
export const initializeApiRoutes = () => apiRoutesInstance.initializeRoutes();
