import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ConfigKeys } from './constant';
import { JwtPayloadDto } from 'src/auth/dto/jwt-payload.dto';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    // private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload: JwtPayloadDto = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get(ConfigKeys.JWT_SECRET_KEY),
      });
      if (!payload.userId) {
        throw new UnauthorizedException();
      }
      request.userId = payload.userId.toString();
      request.userProviderId = payload.userProviderId.toString();
      request.userProvider = payload.userProvider.toString();
      // const requiredRoles = this.reflector.getAllAndOverride<UserType[]>(
      //   ROLES_KEY,
      //   [context.getHandler(), context.getClass()],
      // );

      // if (requiredRoles) {
      //   if (!requiredRoles.includes(payload.type) || !payload.type) {
      //     throw new UnauthorizedException();
      //   }
      // }
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
