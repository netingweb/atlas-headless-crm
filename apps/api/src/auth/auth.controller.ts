import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from '../common/dto/login.dto';
import { JwtAuthGuard } from '@crm-atlas/auth';
import type { AuthenticatedRequest } from '@crm-atlas/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Authenticate with tenant ID, email and password. Returns a JWT token for subsequent API requests.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(body.tenant_id, body.email, body.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user information',
    description: 'Returns the current authenticated user information.',
  })
  @ApiResponse({
    status: 200,
    description: 'User information',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getMe(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    const user = await this.authService.getCurrentUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}
