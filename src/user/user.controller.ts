import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/common/jwt.guard';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { UpdateUserRequestDto } from './dto/request/update.dto';

@ApiTags('User')
@Controller({
  path: 'user',
  version: '1',
})
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: Request) {
    const userId = req['userId'];
    return this.userService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@Req() req: Request, @Body() body: UpdateUserRequestDto) {
    const userId = req['userId'];
    return this.userService.updateProfile(userId, body);
  }
}
