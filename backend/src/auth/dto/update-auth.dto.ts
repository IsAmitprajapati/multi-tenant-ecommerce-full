import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthDto } from './create-auth.dto.js';

export class UpdateAuthDto extends PartialType(CreateAuthDto) {}
